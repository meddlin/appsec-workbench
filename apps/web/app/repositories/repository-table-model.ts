export const repositorySortColumns = [
  "repository",
  "owner",
  "visibility",
  "defaultBranch",
  "archived",
  "branchProtection",
  "secretScanning",
  "openSecretAlerts",
  "openDependabotAlerts",
  "updated",
] as const;

export type SortColumn = (typeof repositorySortColumns)[number];
export type SortDirection = "asc" | "desc";

export interface RepositoryTableRow {
  id: string;
  fullName: string;
  ownerLogin: string;
  visibility: string;
  defaultBranch: string | null;
  archived: boolean;
  hasBranchProtection: boolean | null;
  hasSecretScanning: boolean | null;
  openSecretAlertCount: number;
  openDependabotAlertCount: number;
  updatedAtIso: string;
  updatedAtLabel: string;
}

type SortValue = number | string | null;

function sortValue(row: RepositoryTableRow, column: SortColumn): SortValue {
  switch (column) {
    case "repository":
      return row.fullName;
    case "owner":
      return row.ownerLogin;
    case "visibility":
      return row.visibility;
    case "defaultBranch":
      return row.defaultBranch;
    case "archived":
      return row.archived ? 1 : 0;
    case "branchProtection":
      return row.hasBranchProtection === null
        ? null
        : row.hasBranchProtection
          ? 1
          : 0;
    case "secretScanning":
      return row.hasSecretScanning === null ? null : row.hasSecretScanning ? 1 : 0;
    case "openSecretAlerts":
      return row.openSecretAlertCount;
    case "openDependabotAlerts":
      return row.openDependabotAlertCount;
    case "updated":
      return row.updatedAtIso;
  }
}

function compareValues(
  left: SortValue,
  right: SortValue,
  direction: SortDirection,
): number {
  const leftMissing = left === null || left === "";
  const rightMissing = right === null || right === "";

  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) {
      return 0;
    }

    return leftMissing ? 1 : -1;
  }

  let comparison = 0;
  if (left < right) comparison = -1;
  if (left > right) comparison = 1;

  return direction === "asc" ? comparison : -comparison;
}

export function sortRepositoryRows(
  rows: readonly RepositoryTableRow[],
  column: SortColumn,
  direction: SortDirection,
): RepositoryTableRow[] {
  return [...rows].sort((left, right) => {
    const primaryComparison = compareValues(
      sortValue(left, column),
      sortValue(right, column),
      direction,
    );

    if (primaryComparison !== 0) {
      return primaryComparison;
    }

    return compareValues(left.fullName, right.fullName, "asc");
  });
}
