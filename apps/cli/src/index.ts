#!/usr/bin/env tsx

import { Command } from "commander";
import type {
  AppSecModule,
  ControlEvaluationResult,
  Logger,
  ModuleContext,
} from "@github-inventory/core";
import { findModuleById, listModules } from "@github-inventory/modules";

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

function createModuleContext(): ModuleContext {
  return {
    logger,
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

    const result = await module.ingest(createModuleContext());
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("evaluate")
  .description("Evaluate controls for modules that support evaluation")
  .action(async () => {
    const evaluators = listModules().filter(hasEvaluate);
    const allResults: ControlEvaluationResult[] = [];

    if (evaluators.length === 0) {
      console.log("No modules with evaluation support registered.");
      printEvaluationSummary(allResults);
      return;
    }

    for (const module of evaluators) {
      const results = await module.evaluate(createModuleContext());
      allResults.push(...results);
      console.log(`${module.id}: ${results.length} controls evaluated`);
    }

    printEvaluationSummary(allResults);
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
