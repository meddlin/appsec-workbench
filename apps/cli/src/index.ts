#!/usr/bin/env tsx

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AppSecModule,
  ControlEvaluationResult,
  Logger,
  ModuleContext,
} from "@github-inventory/core";
import type { Prisma } from "@github-inventory/db";
import { findModuleById, listModules } from "@github-inventory/modules";

loadRootEnv();

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
  const summary = results.reduce(
    (counts, result) => {
      counts[result.status] += 1;
      return counts;
    },
    { pass: 0, fail: 0, unknown: 0 },
  );

  console.log(
    `Summary: ${results.length} controls evaluated (${summary.pass} pass, ${summary.fail} fail, ${summary.unknown} unknown).`,
  );
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

    const { prisma } = await import("@github-inventory/db");
    let moduleRun: { id: string } | undefined;

    try {
      moduleRun = await prisma.moduleRun.create({
        data: {
          moduleId: module.id,
          status: "running",
        },
      });

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

      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const message = getErrorMessage(error);

      if (moduleRun) {
        await prisma.moduleRun.update({
          where: { id: moduleRun.id },
          data: {
            status: "failed",
            finishedAt: new Date(),
            error: message,
          },
        });
      }

      console.error(`Module run failed: ${message}`);
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  });

program
  .command("evaluate")
  .description("Evaluate controls for modules that support evaluation")
  .action(async () => {
    const evaluators = listModules().filter(hasEvaluate);
    const allResults: ControlEvaluationResult[] = [];
    let shouldDisconnectDb = false;

    if (evaluators.length === 0) {
      console.log("No modules with evaluation support registered.");
      printEvaluationSummary(allResults);
      return;
    }

    try {
      for (const module of evaluators) {
        shouldDisconnectDb = true;
        const results = await module.evaluate(createModuleContext());
        allResults.push(...results);
        console.log(`${module.id}: ${results.length} controls evaluated`);
      }

      printEvaluationSummary(allResults);
    } finally {
      if (shouldDisconnectDb) {
        const { prisma } = await import("@github-inventory/db");
        await prisma.$disconnect();
      }
    }
  });

const syncCommand = program
  .command("sync")
  .description("Run sync entrypoints");

syncCommand
  .command("scheduled")
  .description("Run the scheduled sync entrypoint")
  .action(() => {
    console.log("Scheduled sync is not implemented yet. No GitHub calls were made.");
  });

await program.parseAsync(process.argv);
