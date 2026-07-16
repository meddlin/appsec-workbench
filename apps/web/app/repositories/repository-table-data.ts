import { formatDateTime } from "../ui";
import type { RepositoryTableRow } from "./repository-table-model";

export interface RepositoryTableRecord {
  id: string;
  fullName: string;
  visibility: string;
  defaultBranch: string | null;
  archived: boolean;
  updatedAt: Date;
  organization: {
    login: string;
  };
  setting: {
    hasBranchProtection: boolean | null;
    hasSecretScanning: boolean | null;
  } | null;
  _count: {
    dependabotAlerts: number;
    secretScanningAlerts: number;
  };
}

export function toRepositoryTableRow(
  repository: RepositoryTableRecord,
): RepositoryTableRow {
  return {
    id: repository.id,
    fullName: repository.fullName,
    ownerLogin: repository.organization.login,
    visibility: repository.visibility,
    defaultBranch: repository.defaultBranch,
    archived: repository.archived,
    hasBranchProtection: repository.setting?.hasBranchProtection ?? null,
    hasSecretScanning: repository.setting?.hasSecretScanning ?? null,
    openSecretAlertCount: repository._count.secretScanningAlerts,
    openDependabotAlertCount: repository._count.dependabotAlerts,
    updatedAtIso: repository.updatedAt.toISOString(),
    updatedAtLabel: formatDateTime(repository.updatedAt),
  };
}
