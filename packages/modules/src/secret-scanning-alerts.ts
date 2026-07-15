import type {
  AppSecModule,
  IngestResult,
  ModuleContext,
} from "@appsec-workbench/core";
import type { Prisma } from "@appsec-workbench/db";
import {
  createGitHubClientFromEnv,
  GitHubApiError,
  type GitHubClient,
  type GitHubSecretScanningAlert,
} from "@appsec-workbench/github";

function toOptionalDate(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value);
}

function toSanitizedJsonValue(
  alert: GitHubSecretScanningAlert,
): Prisma.InputJsonValue {
  const sanitizedAlert = {
    ...(alert as GitHubSecretScanningAlert & { secret?: unknown }),
  };
  delete sanitizedAlert.secret;
  return JSON.parse(JSON.stringify(sanitizedAlert)) as Prisma.InputJsonValue;
}

function getRepositoryParts(fullName: string): { owner: string; repo: string } {
  const separatorIndex = fullName.indexOf("/");

  if (separatorIndex === -1) {
    throw new Error(`Repository fullName is missing owner: ${fullName}`);
  }

  return {
    owner: fullName.slice(0, separatorIndex),
    repo: fullName.slice(separatorIndex + 1),
  };
}

export function normalizeSecretScanningAlert(alert: GitHubSecretScanningAlert) {
  const location = alert.first_location_detected;

  return {
    githubNumber: alert.number,
    state: alert.state,
    resolution: alert.resolution ?? null,
    secretType: alert.secret_type ?? "unknown",
    secretTypeDisplayName: alert.secret_type_display_name ?? null,
    providerSlug: alert.provider_slug ?? null,
    validity: alert.validity ?? null,
    publiclyLeaked: alert.publicly_leaked,
    multiRepo: alert.multi_repo,
    base64Encoded: alert.is_base64_encoded,
    pushProtectionBypassed: alert.push_protection_bypassed,
    path: location?.path ?? null,
    startLine: location?.start_line ?? null,
    endLine: location?.end_line ?? null,
    startColumn: location?.start_column ?? null,
    endColumn: location?.end_column ?? null,
    blobSha: location?.blob_sha ?? null,
    commitSha: location?.commit_sha ?? null,
    htmlUrl: alert.html_url ?? null,
    githubCreatedAt: toOptionalDate(alert.created_at),
    resolvedAt: toOptionalDate(alert.resolved_at),
    pushProtectionBypassedAt: toOptionalDate(
      alert.push_protection_bypassed_at,
    ),
    raw: toSanitizedJsonValue(alert),
  };
}

async function setHasSecretScanning(
  prisma: Pick<Prisma.TransactionClient, "repositorySetting">,
  repositoryId: string,
  hasSecretScanning: boolean,
): Promise<void> {
  await prisma.repositorySetting.upsert({
    where: {
      repositoryId,
    },
    update: {
      hasSecretScanning,
    },
    create: {
      repositoryId,
      hasSecretScanning,
    },
  });
}

export async function ingestSecretScanningAlerts(
  prisma: Pick<
    Prisma.TransactionClient,
    "repository" | "secretScanningAlert" | "repositorySetting"
  >,
  github: Pick<GitHubClient, "listSecretScanningAlerts">,
  ctx: ModuleContext,
): Promise<IngestResult> {
  const repositories = await prisma.repository.findMany({
    orderBy: {
      fullName: "asc",
    },
    select: {
      id: true,
      fullName: true,
    },
  });
  let alertCount = 0;
  let skippedForbiddenCount = 0;
  let skippedNotFoundCount = 0;

  ctx.logger.info("Syncing GitHub secret scanning alerts", {
    repositoryCount: repositories.length,
  });

  for (const repository of repositories) {
    const { owner, repo } = getRepositoryParts(repository.fullName);

    try {
      const alerts = await github.listSecretScanningAlerts(owner, repo);
      const alertNumbers = alerts.map((alert) => alert.number);

      for (const alert of alerts) {
        const alertData = normalizeSecretScanningAlert(alert);

        await prisma.secretScanningAlert.upsert({
          where: {
            repositoryId_githubNumber: {
              repositoryId: repository.id,
              githubNumber: alert.number,
            },
          },
          update: {
            ...alertData,
            lastSeenAt: new Date(),
          },
          create: {
            ...alertData,
            repositoryId: repository.id,
            lastSeenAt: new Date(),
          },
        });
      }

      await prisma.secretScanningAlert.deleteMany({
        where: {
          repositoryId: repository.id,
          ...(alertNumbers.length > 0
            ? {
                githubNumber: {
                  notIn: alertNumbers,
                },
              }
            : {}),
        },
      });

      await setHasSecretScanning(prisma, repository.id, true);
      alertCount += alerts.length;
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 403) {
        skippedForbiddenCount += 1;
        ctx.logger.warn(
          "Skipping repository without secret scanning alert access",
          {
            repository: repository.fullName,
            status: error.status,
          },
        );
        continue;
      }

      if (error instanceof GitHubApiError && error.status === 404) {
        skippedNotFoundCount += 1;
        ctx.logger.warn("Skipping repository without secret scanning alerts", {
          repository: repository.fullName,
          status: error.status,
        });

        await setHasSecretScanning(prisma, repository.id, false);
        continue;
      }

      throw error;
    }
  }

  ctx.logger.info("Synced GitHub secret scanning alerts", {
    repositoryCount: repositories.length,
    alertCount,
    skippedForbiddenCount,
    skippedNotFoundCount,
  });

  return {
    status: "success",
    message: `Synced ${alertCount} secret scanning alerts across ${repositories.length} repositories.`,
    recordsProcessed: alertCount,
    summary: {
      repositoryCount: repositories.length,
      alertCount,
      skippedForbiddenCount,
      skippedNotFoundCount,
    },
  };
}

export const secretScanningAlertsModule: AppSecModule = {
  id: "secret-scanning-alerts",
  name: "Secret Scanning Alerts",
  description: "Syncs secret scanning alerts from the GitHub REST API.",
  async ingest(ctx) {
    const { prisma } = await import("@appsec-workbench/db");
    const github = createGitHubClientFromEnv();
    return ingestSecretScanningAlerts(prisma, github, ctx);
  },
};
