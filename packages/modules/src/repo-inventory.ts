import type { AppSecModule } from "@github-inventory/core";
import { createGitHubClientFromEnv, type GitHubRepository } from "@github-inventory/github";

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

export const repoInventoryModule: AppSecModule = {
  id: "repo-inventory",
  name: "Repository Inventory",
  description: "Syncs repository inventory from the GitHub REST API.",
  async ingest(ctx) {
    const { prisma } = await import("@github-inventory/db");
    const github = createGitHubClientFromEnv();
    const repositories = await github.listRepositories();
    const organizationsByLogin = new Map<string, string>();

    ctx.logger.info("Syncing GitHub repository inventory", {
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

      await prisma.repository.upsert({
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
      });
    }

    return {
      status: "success",
      message: "Synced GitHub repository inventory.",
      recordsProcessed: repositories.length,
    };
  },
};
