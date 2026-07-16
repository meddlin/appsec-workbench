import { describe, expect, it } from "vitest";
import { toRepositoryTableRow } from "./repository-table-data";
import {
  sortRepositoryRows,
  type RepositoryTableRow,
  type SortColumn,
} from "./repository-table-model";

function row(
  fullName: string,
  overrides: Partial<RepositoryTableRow> = {},
): RepositoryTableRow {
  return {
    id: fullName,
    fullName,
    ownerLogin: "owner",
    visibility: "public",
    defaultBranch: "main",
    archived: false,
    hasBranchProtection: false,
    hasSecretScanning: false,
    openSecretAlertCount: 0,
    openDependabotAlertCount: 0,
    updatedAtIso: "2026-01-01T00:00:00.000Z",
    updatedAtLabel: "Jan 1, 2026, 12:00 AM",
    ...overrides,
  };
}

describe("toRepositoryTableRow", () => {
  it("serializes dates and filtered alert counts into primitive values", () => {
    const result = toRepositoryTableRow({
      id: "repo-id",
      fullName: "octo/repo",
      visibility: "private",
      defaultBranch: "main",
      archived: false,
      updatedAt: new Date("2026-07-16T12:00:00.000Z"),
      organization: { login: "octo" },
      setting: {
        hasBranchProtection: true,
        hasSecretScanning: null,
      },
      _count: {
        dependabotAlerts: 2,
        secretScanningAlerts: 3,
      },
    });

    expect(result).toMatchObject({
      ownerLogin: "octo",
      hasBranchProtection: true,
      hasSecretScanning: null,
      openDependabotAlertCount: 2,
      openSecretAlertCount: 3,
      updatedAtIso: "2026-07-16T12:00:00.000Z",
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});

describe("sortRepositoryRows", () => {
  const cases: Array<{
    column: SortColumn;
    low: Partial<RepositoryTableRow>;
    high: Partial<RepositoryTableRow>;
  }> = [
    { column: "repository", low: { fullName: "a/repo" }, high: { fullName: "z/repo" } },
    { column: "owner", low: { ownerLogin: "a" }, high: { ownerLogin: "z" } },
    { column: "visibility", low: { visibility: "private" }, high: { visibility: "public" } },
    { column: "defaultBranch", low: { defaultBranch: "develop" }, high: { defaultBranch: "main" } },
    { column: "archived", low: { archived: false }, high: { archived: true } },
    {
      column: "branchProtection",
      low: { hasBranchProtection: false },
      high: { hasBranchProtection: true },
    },
    {
      column: "secretScanning",
      low: { hasSecretScanning: false },
      high: { hasSecretScanning: true },
    },
    {
      column: "openSecretAlerts",
      low: { openSecretAlertCount: 1 },
      high: { openSecretAlertCount: 9 },
    },
    {
      column: "openDependabotAlerts",
      low: { openDependabotAlertCount: 1 },
      high: { openDependabotAlertCount: 9 },
    },
    {
      column: "updated",
      low: { updatedAtIso: "2026-01-01T00:00:00.000Z" },
      high: { updatedAtIso: "2026-07-01T00:00:00.000Z" },
    },
  ];

  it.each(cases)("sorts $column in both directions", ({ column, low, high }) => {
    const lowRow = row("low/repo", low);
    const highRow = row("high/repo", high);

    expect(sortRepositoryRows([highRow, lowRow], column, "asc")).toEqual([
      lowRow,
      highRow,
    ]);
    expect(sortRepositoryRows([lowRow, highRow], column, "desc")).toEqual([
      highRow,
      lowRow,
    ]);
  });

  it("keeps missing values last in either direction", () => {
    const present = row("present/repo", { defaultBranch: "main" });
    const missing = row("missing/repo", { defaultBranch: null });

    expect(sortRepositoryRows([missing, present], "defaultBranch", "asc")).toEqual([
      present,
      missing,
    ]);
    expect(sortRepositoryRows([missing, present], "defaultBranch", "desc")).toEqual([
      present,
      missing,
    ]);
  });

  it("uses repository name as a stable ascending tie-breaker", () => {
    const alpha = row("a/repo", { ownerLogin: "same" });
    const beta = row("b/repo", { ownerLogin: "same" });

    expect(sortRepositoryRows([beta, alpha], "owner", "desc")).toEqual([
      alpha,
      beta,
    ]);
  });
});
