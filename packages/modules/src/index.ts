import type { AppSecModule } from "@github-inventory/core";
import { codeQlAlertsModule } from "./codeql-alerts";
import { demoRepoInventoryModule } from "./demo-repo-inventory";
import { dependabotAlertsModule } from "./dependabot-alerts";
import { repoInventoryModule } from "./repo-inventory";

const registeredModules: AppSecModule[] = [
  demoRepoInventoryModule,
  repoInventoryModule,
  dependabotAlertsModule,
  codeQlAlertsModule,
];

export function listModules(): readonly AppSecModule[] {
  return registeredModules;
}

export function findModuleById(moduleId: string): AppSecModule | undefined {
  return registeredModules.find((module) => module.id === moduleId);
}
