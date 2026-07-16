import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  github: {
    listSecretScanningAlerts: vi.fn(),
  },
  prisma: {
    repository: {
      findMany: vi.fn(),
    },
    secretScanningAlert: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    repositorySetting: {
      upsert: vi.fn(),
    },
  },
}));

import { GitHubApiError } from "../../../packages/github/src/index";
import {
  findModuleById,
  ingestSecretScanningAlerts,
  normalizeSecretScanningAlert,
  secretScanningAlertsModule,
} from "@appsec-workbench/modules";

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

async function ingest() {
  return ingestSecretScanningAlerts(
    mocks.prisma as Parameters<typeof ingestSecretScanningAlerts>[0],
    mocks.github as Parameters<typeof ingestSecretScanningAlerts>[1],
    { logger },
  );
}

describe("secret scanning alerts module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.secretScanningAlert.upsert.mockResolvedValue({});
    mocks.prisma.secretScanningAlert.deleteMany.mockResolvedValue({ count: 0 });
    mocks.prisma.repositorySetting.upsert.mockResolvedValue({});
  });

  it("is registered as an ingestible module", () => {
    expect(findModuleById("secret-scanning-alerts")?.ingest).toBeTypeOf(
      "function",
    );
  });

  it("normalizes metadata and strips secret values from raw JSON", () => {
    const normalized = normalizeSecretScanningAlert({
      number: 42,
      state: "resolved",
      resolution: "revoked",
      secret_type: "github_personal_access_token",
      validity: "inactive",
      push_protection_bypassed: true,
      created_at: "2026-07-01T12:00:00Z",
      first_location_detected: {
        path: "config/example.env",
        start_line: 3,
      },
      secret: "github_pat_live_value",
    } as Parameters<typeof normalizeSecretScanningAlert>[0] & {
      secret: string;
    });

    expect(normalized).toMatchObject({
      githubNumber: 42,
      resolution: "revoked",
      secretType: "github_personal_access_token",
      path: "config/example.env",
      startLine: 3,
    });
    expect(normalized.raw).not.toHaveProperty("secret");
  });

  it("upserts current alerts, removes stale rows, and marks scanning enabled", async () => {
    mocks.prisma.repository.findMany.mockResolvedValue([
      { id: "repo-1", fullName: "octo-org/repo" },
    ]);
    mocks.github.listSecretScanningAlerts.mockResolvedValue([
      {
        number: 42,
        state: "open",
        secret_type: "github_personal_access_token",
      },
    ]);

    const result = await ingest();

    expect(mocks.prisma.secretScanningAlert.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          repositoryId_githubNumber: {
            repositoryId: "repo-1",
            githubNumber: 42,
          },
        },
      }),
    );
    expect(mocks.prisma.secretScanningAlert.deleteMany).toHaveBeenCalledWith({
      where: {
        repositoryId: "repo-1",
        githubNumber: { notIn: [42] },
      },
    });
    expect(mocks.prisma.repositorySetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { hasSecretScanning: true } }),
    );
    expect(result).toMatchObject({
      status: "success",
      recordsProcessed: 1,
    });
  });

  it("deletes all stale rows after a successful empty response", async () => {
    mocks.prisma.repository.findMany.mockResolvedValue([
      { id: "repo-1", fullName: "octo-org/repo" },
    ]);
    mocks.github.listSecretScanningAlerts.mockResolvedValue([]);

    await ingest();

    expect(mocks.prisma.secretScanningAlert.deleteMany).toHaveBeenCalledWith({
      where: { repositoryId: "repo-1" },
    });
  });

  it("preserves state on 403 and marks scanning disabled on 404", async () => {
    mocks.prisma.repository.findMany.mockResolvedValue([
      { id: "repo-1", fullName: "octo-org/forbidden" },
      { id: "repo-2", fullName: "octo-org/not-found" },
    ]);
    mocks.github.listSecretScanningAlerts
      .mockRejectedValueOnce(
        new GitHubApiError("Forbidden", 403, "https://api.github.test"),
      )
      .mockRejectedValueOnce(
        new GitHubApiError("Not found", 404, "https://api.github.test"),
      );

    const result = await ingest();

    expect(mocks.prisma.secretScanningAlert.deleteMany).not.toHaveBeenCalled();
    expect(mocks.prisma.repositorySetting.upsert).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.repositorySetting.upsert).toHaveBeenCalledWith({
      where: { repositoryId: "repo-2" },
      update: { hasSecretScanning: false },
      create: { repositoryId: "repo-2", hasSecretScanning: false },
    });
    expect(result.summary).toMatchObject({
      skippedForbiddenCount: 1,
      skippedNotFoundCount: 1,
    });
  });

  it("fails the run for unexpected GitHub errors", async () => {
    mocks.prisma.repository.findMany.mockResolvedValue([
      { id: "repo-1", fullName: "octo-org/repo" },
    ]);
    mocks.github.listSecretScanningAlerts.mockRejectedValue(
      new GitHubApiError("Unavailable", 503, "https://api.github.test"),
    );

    await expect(ingest()).rejects.toMatchObject({ status: 503 });
    expect(mocks.prisma.secretScanningAlert.deleteMany).not.toHaveBeenCalled();
  });
});
