import type { AppSecModule } from "@github-inventory/core";

const registeredModules: AppSecModule[] = [];

export function listModules(): readonly AppSecModule[] {
  return registeredModules;
}

export function findModuleById(moduleId: string): AppSecModule | undefined {
  return registeredModules.find((module) => module.id === moduleId);
}
