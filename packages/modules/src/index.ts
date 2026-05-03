import type { AppSecModule } from "@github-inventory/core";
import { demoRepoInventoryModule } from "./demo-repo-inventory";
import { repoInventoryModule } from "./repo-inventory";

const registeredModules: AppSecModule[] = [
  demoRepoInventoryModule,
  repoInventoryModule,
];

export function listModules(): readonly AppSecModule[] {
  return registeredModules;
}

export function findModuleById(moduleId: string): AppSecModule | undefined {
  return registeredModules.find((module) => module.id === moduleId);
}
