import type { AppSecModule } from "@github-inventory/core";
import type { Prisma } from "@github-inventory/db";
import {
  createGitHubClientFromEnv,
  GitHubApiError,
  type GitHubCodeScanningAlert,
} from "@github-inventory/github";

type NormalizedCodeScanningSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "informational";

function toOptionalDate(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value);
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toNormalizedSeverity(
  severity: string | null | undefined,
): NormalizedCodeScanningSeverity {
  if (
    severity === "critical" ||
    severity === "high" ||
    severity === "medium" ||
    severity === "low"
  ) {
    return severity;
  }

  return "informational";
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

function getAlertData(alert: GitHubCodeScanningAlert): {
  githubNumber: number;
  state: string;
  severity: NormalizedCodeScanningSeverity;
  githubRuleSeverity: string | null;
  ruleId: string | null;
  ruleName: string | null;
  ruleDescription: string | null;
  toolName: string | null;
  toolVersion: string | null;
  path: string | null;
  startLine: number | null;
  endLine: number | null;
  commitSha: string | null;
  ref: string | null;
  message: string | null;
  htmlUrl: string | null;
  githubCreatedAt: Date | undefined;
  githubUpdatedAt: Date | undefined;
  fixedAt: Date | undefined;
  dismissedAt: Date | undefined;
  raw: Prisma.InputJsonValue;
} {
  const instance = alert.most_recent_instance;
  const location = instance?.location;

  return {
    githubNumber: alert.number,
    state: alert.state,
    severity: toNormalizedSeverity(alert.rule?.security_severity_level),
    githubRuleSeverity: alert.rule?.severity ?? null,
    ruleId: alert.rule?.id ?? null,
    ruleName: alert.rule?.name ?? null,
    ruleDescription: alert.rule?.description ?? null,
    toolName: alert.tool?.name ?? null,
    toolVersion: alert.tool?.version ?? null,
    path: location?.path ?? null,
    startLine: location?.start_line ?? null,
    endLine: location?.end_line ?? null,
    commitSha: instance?.commit_sha ?? null,
    ref: instance?.ref ?? null,
    message: instance?.message?.text ?? null,
    htmlUrl: alert.html_url ?? null,
    githubCreatedAt: toOptionalDate(alert.created_at),
    githubUpdatedAt: toOptionalDate(alert.updated_at),
    fixedAt: toOptionalDate(alert.fixed_at),
    dismissedAt: toOptionalDate(alert.dismissed_at),
    raw: toJsonValue(alert),
  };
}

async function setHasCodeScanning(
  prisma: Prisma.TransactionClient,
  repositoryId: string,
  hasCodeScanning: boolean,
): Promise<void> {
  await prisma.repositorySetting.upsert({
    where: {
      repositoryId,
    },
    update: {
      hasCodeScanning,
    },
    create: {
      repositoryId,
      hasCodeScanning,
    },
  });
}

export const codeQlAlertsModule: AppSecModule = {
  id: "codeql-alerts",
  name: "CodeQL Code Scanning Alerts",
  description: "Syncs CodeQL code scanning alerts from the GitHub REST API.",
  async ingest(ctx) {
    const { prisma } = await import("@github-inventory/db");
    const github = createGitHubClientFromEnv();
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

    ctx.logger.info("Syncing GitHub CodeQL code scanning alerts", {
      repositoryCount: repositories.length,
    });

    for (const repository of repositories) {
      const { owner, repo } = getRepositoryParts(repository.fullName);

      try {
        const alerts = await github.listCodeScanningAlerts(owner, repo, {
          toolName: "CodeQL",
        });
        const alertNumbers = alerts.map((alert) => alert.number);

        for (const alert of alerts) {
          const alertData = getAlertData(alert);

          await prisma.codeQlAlert.upsert({
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

        await prisma.codeQlAlert.deleteMany({
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

        await setHasCodeScanning(prisma, repository.id, true);
        alertCount += alerts.length;
      } catch (error) {
        if (error instanceof GitHubApiError && error.status === 403) {
          skippedForbiddenCount += 1;
          ctx.logger.warn(
            "Skipping repository without CodeQL code scanning alert access",
            {
              repository: repository.fullName,
              status: error.status,
            },
          );

          await setHasCodeScanning(prisma, repository.id, false);
          continue;
        }

        if (error instanceof GitHubApiError && error.status === 404) {
          skippedNotFoundCount += 1;
          ctx.logger.warn("Skipping repository without CodeQL code scanning alerts", {
            repository: repository.fullName,
            status: error.status,
          });

          await setHasCodeScanning(prisma, repository.id, false);
          continue;
        }

        throw error;
      }
    }

    ctx.logger.info("Synced GitHub CodeQL code scanning alerts", {
      repositoryCount: repositories.length,
      alertCount,
      skippedForbiddenCount,
      skippedNotFoundCount,
    });

    return {
      status: "success",
      message: `Synced ${alertCount} CodeQL code scanning alerts across ${repositories.length} repositories.`,
      recordsProcessed: alertCount,
      summary: {
        repositoryCount: repositories.length,
        skippedForbiddenCount,
        skippedNotFoundCount,
      },
    };
  },
};
