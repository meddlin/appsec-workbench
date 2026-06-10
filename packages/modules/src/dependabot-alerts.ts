import type { AppSecModule } from "@appsec-workbench/core";
import type { Prisma } from "@appsec-workbench/db";
import {
  createGitHubClientFromEnv,
  GitHubApiError,
  type GitHubDependabotAlert,
  type GitHubRepository,
} from "@appsec-workbench/github";

type RepositoryVisibility = "public" | "private" | "internal";

function toRepositoryVisibility(repository: GitHubRepository): RepositoryVisibility {
  if (repository.visibility === "internal") {
    return "internal";
  }

  return repository.private ? "private" : "public";
}

function toOptionalDate(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(value);
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getRepositoryName(fullName: string): string {
  return fullName.split("/").slice(1).join("/");
}

function getAlertData(alert: GitHubDependabotAlert): {
  githubNumber: number;
  state: string;
  severity: string | null;
  packageName: string | null;
  ecosystem: string | null;
  manifestPath: string | null;
  dependencyScope: string | null;
  ghsaId: string | null;
  cveId: string | null;
  advisorySummary: string | null;
  vulnerableVersionRange: string | null;
  patchedVersions: string | null;
  htmlUrl: string | null;
  githubCreatedAt: Date | undefined;
  githubUpdatedAt: Date | undefined;
  fixedAt: Date | undefined;
  dismissedAt: Date | undefined;
  raw: Prisma.InputJsonValue;
} {
  const dependencyPackage = alert.dependency?.package;
  const vulnerabilityPackage = alert.security_vulnerability?.package;

  return {
    githubNumber: alert.number,
    state: alert.state,
    severity: alert.security_advisory?.severity ?? null,
    packageName: dependencyPackage?.name ?? vulnerabilityPackage?.name ?? null,
    ecosystem: dependencyPackage?.ecosystem ?? vulnerabilityPackage?.ecosystem ?? null,
    manifestPath: alert.dependency?.manifest_path ?? null,
    dependencyScope: alert.dependency?.scope ?? null,
    ghsaId: alert.security_advisory?.ghsa_id ?? null,
    cveId: alert.security_advisory?.cve_id ?? null,
    advisorySummary: alert.security_advisory?.summary ?? null,
    vulnerableVersionRange:
      alert.security_vulnerability?.vulnerable_version_range ?? null,
    patchedVersions: alert.security_vulnerability?.patched_versions ?? null,
    htmlUrl: alert.html_url ?? null,
    githubCreatedAt: toOptionalDate(alert.created_at),
    githubUpdatedAt: toOptionalDate(alert.updated_at),
    fixedAt: toOptionalDate(alert.fixed_at),
    dismissedAt: toOptionalDate(alert.dismissed_at),
    raw: toJsonValue(alert),
  };
}

export const dependabotAlertsModule: AppSecModule = {
  id: "dependabot-alerts",
  name: "Dependabot Alerts",
  description: "Syncs Dependabot alerts from the GitHub REST API.",
  async ingest(ctx) {
    const { prisma } = await import("@appsec-workbench/db");
    const github = createGitHubClientFromEnv();
    const repositories = await github.listRepositories();
    const organizationsByLogin = new Map<string, string>();
    let alertCount = 0;
    let skippedForbiddenCount = 0;
    let skippedNotFoundCount = 0;

    ctx.logger.info("Syncing GitHub Dependabot alerts", {
      repositoryCount: repositories.length,
    });

    for (const repository of repositories) {
      const ownerLogin = repository.owner.login;
      let organizationId = organizationsByLogin.get(ownerLogin);

      if (!organizationId) {
        const organization = await prisma.organization.upsert({
          where: {
            login: ownerLogin,
          },
          update: {
            githubId: String(repository.owner.id),
          },
          create: {
            githubId: String(repository.owner.id),
            login: ownerLogin,
            name: ownerLogin,
          },
        });

        organizationId = organization.id;
        organizationsByLogin.set(ownerLogin, organizationId);
      }

      const savedRepository = await prisma.repository.upsert({
        where: {
          fullName: repository.full_name,
        },
        update: {
          githubId: String(repository.id),
          organizationId,
          name: repository.name,
          fullName: repository.full_name,
          visibility: toRepositoryVisibility(repository),
          archived: repository.archived,
          defaultBranch: repository.default_branch,
          primaryLanguage: repository.language,
          pushedAt: toOptionalDate(repository.pushed_at),
          githubCreatedAt: toOptionalDate(repository.created_at),
          githubUpdatedAt: toOptionalDate(repository.updated_at),
        },
        create: {
          githubId: String(repository.id),
          organizationId,
          name: repository.name || getRepositoryName(repository.full_name),
          fullName: repository.full_name,
          visibility: toRepositoryVisibility(repository),
          archived: repository.archived,
          defaultBranch: repository.default_branch,
          primaryLanguage: repository.language,
          pushedAt: toOptionalDate(repository.pushed_at),
          githubCreatedAt: toOptionalDate(repository.created_at),
          githubUpdatedAt: toOptionalDate(repository.updated_at),
        },
      });

      try {
        const alerts = await github.listDependabotAlerts(
          ownerLogin,
          repository.name,
        );
        const alertNumbers = alerts.map((alert) => alert.number);

        for (const alert of alerts) {
          const alertData = getAlertData(alert);

          await prisma.dependabotAlert.upsert({
            where: {
              repositoryId_githubNumber: {
                repositoryId: savedRepository.id,
                githubNumber: alert.number,
              },
            },
            update: {
              ...alertData,
              lastSeenAt: new Date(),
            },
            create: {
              ...alertData,
              repositoryId: savedRepository.id,
              lastSeenAt: new Date(),
            },
          });
        }

        await prisma.dependabotAlert.deleteMany({
          where: {
            repositoryId: savedRepository.id,
            ...(alertNumbers.length > 0
              ? {
                  githubNumber: {
                    notIn: alertNumbers,
                  },
                }
              : {}),
          },
        });

        await prisma.repositorySetting.upsert({
          where: {
            repositoryId: savedRepository.id,
          },
          update: {
            hasDependabotAlerts: true,
          },
          create: {
            repositoryId: savedRepository.id,
            hasDependabotAlerts: true,
          },
        });

        alertCount += alerts.length;
      } catch (error) {
        if (error instanceof GitHubApiError && error.status === 403) {
          skippedForbiddenCount += 1;
          ctx.logger.warn("Skipping repository without Dependabot alert access", {
            repository: repository.full_name,
            status: error.status,
          });
          continue;
        }

        if (error instanceof GitHubApiError && error.status === 404) {
          skippedNotFoundCount += 1;
          ctx.logger.warn("Skipping repository without Dependabot alerts", {
            repository: repository.full_name,
            status: error.status,
          });

          await prisma.repositorySetting.upsert({
            where: {
              repositoryId: savedRepository.id,
            },
            update: {
              hasDependabotAlerts: false,
            },
            create: {
              repositoryId: savedRepository.id,
              hasDependabotAlerts: false,
            },
          });

          continue;
        }

        throw error;
      }
    }

    ctx.logger.info("Synced GitHub Dependabot alerts", {
      repositoryCount: repositories.length,
      alertCount,
      skippedForbiddenCount,
      skippedNotFoundCount,
    });

    return {
      status: "success",
      message: `Synced ${alertCount} Dependabot alerts across ${repositories.length} repositories.`,
      recordsProcessed: alertCount,
      summary: {
        repositoryCount: repositories.length,
        skippedForbiddenCount,
        skippedNotFoundCount,
      },
    };
  },
};
