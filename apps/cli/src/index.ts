#!/usr/bin/env tsx

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AppSecModule,
  ControlEvaluationResult,
  IngestResult,
  Logger,
  ModuleContext,
} from "@appsec-workbench/core";
import type { Prisma, PrismaClient } from "@appsec-workbench/db";
import { findModuleById, listModules } from "@appsec-workbench/modules";

loadRootEnv();

const scheduledModuleIds = [
  "repo-inventory",
  "branch-protection",
  "dependabot-alerts",
  "codeql-alerts",
];

const logger: Logger = {
  debug: (message, metadata) => writeLog("debug", message, metadata),
  info: (message, metadata) => writeLog("info", message, metadata),
  warn: (message, metadata) => writeLog("warn", message, metadata),
  error: (message, metadata) => writeLog("error", message, metadata),
};

function writeLog(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  metadata?: Record<string, unknown>,
): void {
  const suffix = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.error(`[${level}] ${message}${suffix}`);
}

function createModuleContext(runId?: string): ModuleContext {
  return {
    logger,
    runId,
  };
}

function hasEvaluate(
  module: AppSecModule,
): module is AppSecModule & Required<Pick<AppSecModule, "evaluate">> {
  return typeof module.evaluate === "function";
}

function printEvaluationSummary(results: ControlEvaluationResult[]): void {
  const summary = summarizeEvaluationResults(results);

  console.log(
    `Summary: ${results.length} controls evaluated (${summary.pass} pass, ${summary.fail} fail, ${summary.unknown} unknown).`,
  );
}

function summarizeEvaluationResults(results: ControlEvaluationResult[]): {
  pass: number;
  fail: number;
  unknown: number;
} {
  return results.reduce(
    (counts, result) => {
      counts[result.status] += 1;
      return counts;
    },
    { pass: 0, fail: 0, unknown: 0 },
  );
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runModuleIngest(
  prisma: PrismaClient,
  module: AppSecModule,
): Promise<
  | {
      status: "success";
      moduleId: string;
      result: IngestResult;
    }
  | {
      status: "failed";
      moduleId: string;
      message: string;
    }
> {
  if (!module.ingest) {
    return {
      status: "failed",
      moduleId: module.id,
      message: "Module does not support ingestion.",
    };
  }

  const moduleRun = await prisma.moduleRun.create({
    data: {
      moduleId: module.id,
      status: "running",
    },
  });

  try {
    const result = await module.ingest(createModuleContext(moduleRun.id));
    const finalStatus = result.status === "failed" ? "failed" : "success";

    await prisma.moduleRun.update({
      where: { id: moduleRun.id },
      data: {
        status: finalStatus,
        finishedAt: new Date(),
        summary: toJsonValue(result),
      },
    });

    if (finalStatus === "failed") {
      return {
        status: "failed",
        moduleId: module.id,
        message: result.message ?? "Module reported failure.",
      };
    }

    return {
      status: "success",
      moduleId: module.id,
      result,
    };
  } catch (error) {
    const message = getErrorMessage(error);

    await prisma.moduleRun.update({
      where: { id: moduleRun.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: message,
      },
    });

    return {
      status: "failed",
      moduleId: module.id,
      message,
    };
  }
}

async function runComplianceEvaluation(
  prisma: PrismaClient,
): Promise<
  | {
      status: "success";
      results: ControlEvaluationResult[];
      summary: ReturnType<typeof summarizeEvaluationResults>;
    }
  | {
      status: "failed";
      results: ControlEvaluationResult[];
      summary: ReturnType<typeof summarizeEvaluationResults>;
      message: string;
    }
> {
  const evaluators = listModules().filter(hasEvaluate);
  const moduleRun = await prisma.moduleRun.create({
    data: {
      moduleId: "compliance-evaluation",
      status: "running",
    },
  });
  const allResults: ControlEvaluationResult[] = [];

  try {
    for (const module of evaluators) {
      const results = await module.evaluate(createModuleContext(moduleRun.id));
      allResults.push(...results);
    }

    const summary = summarizeEvaluationResults(allResults);

    await prisma.moduleRun.update({
      where: { id: moduleRun.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        summary: toJsonValue({
          moduleCount: evaluators.length,
          resultCount: allResults.length,
          ...summary,
        }),
      },
    });

    return {
      status: "success",
      results: allResults,
      summary,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    const summary = summarizeEvaluationResults(allResults);

    await prisma.moduleRun.update({
      where: { id: moduleRun.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        summary: toJsonValue({
          moduleCount: evaluators.length,
          resultCount: allResults.length,
          ...summary,
        }),
        error: message,
      },
    });

    return {
      status: "failed",
      results: allResults,
      summary,
      message,
    };
  }
}

function loadRootEnv(): void {
  const cliDir = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(cliDir, "../../../.env");

  try {
    const content = readFileSync(envPath, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // The CLI can still run with env vars supplied directly by the shell.
  }
}

const program = new Command();

program
  .name("appsec")
  .description("Local AppSec control plane CLI")
  .version("0.1.0");

const modulesCommand = program
  .command("modules")
  .description("Inspect registered AppSec modules");

modulesCommand
  .command("list")
  .description("List registered AppSec modules")
  .action(() => {
    const modules = listModules();

    if (modules.length === 0) {
      console.log("No modules registered.");
      return;
    }

    for (const module of modules) {
      console.log(`${module.id}\t${module.name}\t${module.description}`);
    }
  });

program
  .command("run")
  .description("Run ingestion for a module")
  .argument("<moduleId>", "Module ID to run")
  .action(async (moduleId: string) => {
    const module = findModuleById(moduleId);

    if (!module) {
      console.error(`Module not found: ${moduleId}`);
      process.exitCode = 1;
      return;
    }

    if (!module.ingest) {
      console.error(`Module does not support ingestion: ${moduleId}`);
      process.exitCode = 1;
      return;
    }

    const { prisma } = await import("@appsec-workbench/db");

    try {
      const outcome = await runModuleIngest(prisma, module);

      if (outcome.status === "failed") {
        console.error(`Module run failed: ${outcome.message}`);
        process.exitCode = 1;
        return;
      }

      console.log(JSON.stringify(outcome.result, null, 2));
    } finally {
      await prisma.$disconnect();
    }
  });

program
  .command("evaluate")
  .description("Evaluate controls for modules that support evaluation")
  .action(async () => {
    const { prisma } = await import("@appsec-workbench/db");

    try {
      const outcome = await runComplianceEvaluation(prisma);

      if (outcome.results.length === 0) {
        console.log("No controls evaluated.");
      } else {
        printEvaluationSummary(outcome.results);
      }

      if (outcome.status === "failed") {
        console.error(`Compliance evaluation failed: ${outcome.message}`);
        process.exitCode = 1;
      }
    } finally {
      await prisma.$disconnect();
    }
  });

const syncCommand = program
  .command("sync")
  .description("Run sync entrypoints");

syncCommand
  .command("scheduled")
  .description("Run the scheduled sync entrypoint")
  .action(async () => {
    const { prisma } = await import("@appsec-workbench/db");
    const syncOutcomes: Array<{
      moduleId: string;
      status: "success" | "failed" | "skipped";
      message: string;
    }> = [];
    let hasFailure = false;

    console.log("Starting scheduled sync");

    try {
      for (const moduleId of scheduledModuleIds) {
        const module = findModuleById(moduleId);

        if (!module) {
          syncOutcomes.push({
            moduleId,
            status: "skipped",
            message: "Module is not registered.",
          });
          console.log(`[skipped] ${moduleId}: module is not registered`);
          continue;
        }

        if (!module.ingest) {
          syncOutcomes.push({
            moduleId,
            status: "skipped",
            message: "Module does not support ingestion.",
          });
          console.log(`[skipped] ${moduleId}: no ingestion function`);
          continue;
        }

        console.log(`[running] ${moduleId}`);
        const outcome = await runModuleIngest(prisma, module);

        if (outcome.status === "failed") {
          hasFailure = true;
          syncOutcomes.push({
            moduleId,
            status: "failed",
            message: outcome.message,
          });
          console.log(`[failed] ${moduleId}: ${outcome.message}`);
          continue;
        }

        const recordsProcessed = outcome.result.recordsProcessed ?? 0;
        syncOutcomes.push({
          moduleId,
          status: "success",
          message: `${recordsProcessed} records processed.`,
        });
        console.log(`[success] ${moduleId}: ${recordsProcessed} records processed`);
      }

      console.log("[running] compliance-evaluation");
      const evaluationOutcome = await runComplianceEvaluation(prisma);

      if (evaluationOutcome.status === "failed") {
        hasFailure = true;
        console.log(
          `[failed] compliance-evaluation: ${evaluationOutcome.message}`,
        );
      } else {
        console.log(
          `[success] compliance-evaluation: ${evaluationOutcome.results.length} controls evaluated`,
        );
      }

      console.log("");
      console.log("Scheduled sync summary");
      console.log("----------------------");

      for (const outcome of syncOutcomes) {
        console.log(`${outcome.status.toUpperCase()} ${outcome.moduleId}: ${outcome.message}`);
      }

      console.log(
        `${evaluationOutcome.status.toUpperCase()} compliance-evaluation: ${evaluationOutcome.results.length} controls evaluated (${evaluationOutcome.summary.pass} pass, ${evaluationOutcome.summary.fail} fail, ${evaluationOutcome.summary.unknown} unknown)`,
      );

      if (hasFailure) {
        process.exitCode = 1;
      }
    } finally {
      await prisma.$disconnect();
    }
  });

await program.parseAsync(process.argv);
