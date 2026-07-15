import type { AppSecModule } from "@appsec-workbench/core";
import { codeQlAlertsModule } from "./codeql-alerts";
import { demoRepoInventoryModule } from "./demo-repo-inventory";
import { dependabotAlertsModule } from "./dependabot-alerts";
import { repoInventoryModule } from "./repo-inventory";
import { secretScanningAlertsModule } from "./secret-scanning-alerts";

const registeredModules: AppSecModule[] = [
  demoRepoInventoryModule,
  repoInventoryModule,
  dependabotAlertsModule,
  codeQlAlertsModule,
  secretScanningAlertsModule,
];

export function listModules(): readonly AppSecModule[] {
  return registeredModules;
}

export function findModuleById(moduleId: string): AppSecModule | undefined {
  return registeredModules.find((module) => module.id === moduleId);
}

export {
  ingestSecretScanningAlerts,
  normalizeSecretScanningAlert,
  secretScanningAlertsModule,
} from "./secret-scanning-alerts";
