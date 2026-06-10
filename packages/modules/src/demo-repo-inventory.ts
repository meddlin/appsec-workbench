import type { AppSecModule, ControlEvaluationResult } from "@appsec-workbench/core";

const demoRepositories = [
  {
    name: "payment-service",
    fullName: "demo-org/payment-service",
    visibility: "private" as const,
    defaultBranch: "main",
    archived: false,
    settings: {
      hasBranchProtection: true,
      hasDependabotAlerts: true,
      hasSecretScanning: true,
      hasCodeScanning: true,
    },
  },
  {
    name: "marketing-site",
    fullName: "demo-org/marketing-site",
    visibility: "public" as const,
    defaultBranch: "main",
    archived: false,
    settings: {
      hasBranchProtection: false,
      hasDependabotAlerts: true,
      hasSecretScanning: false,
      hasCodeScanning: false,
    },
  },
  {
    name: "legacy-admin",
    fullName: "demo-org/legacy-admin",
    visibility: "private" as const,
    defaultBranch: "master",
    archived: true,
    settings: {
      hasBranchProtection: false,
      hasDependabotAlerts: false,
      hasSecretScanning: false,
      hasCodeScanning: false,
    },
  },
];

export const demoRepoInventoryModule: AppSecModule = {
  id: "demo-repo-inventory",
  name: "Demo Repository Inventory",
  description: "Seeds fake repository inventory for local development.",
  async ingest(ctx) {
    const { prisma } = await import("@appsec-workbench/db");

    ctx.logger.info("Seeding demo repository inventory");

    const organization = await prisma.organization.upsert({
      where: { login: "demo-org" },
      update: {
        name: "Demo Organization",
      },
      create: {
        login: "demo-org",
        name: "Demo Organization",
      },
    });

    const control = await prisma.control.upsert({
      where: { key: "demo-repo-security-baseline" },
      update: {
        name: "Demo Repository Security Baseline",
        description: "Checks basic repository security settings for demo data.",
      },
      create: {
        key: "demo-repo-security-baseline",
        name: "Demo Repository Security Baseline",
        description: "Checks basic repository security settings for demo data.",
      },
    });

    for (const repository of demoRepositories) {
      const savedRepository = await prisma.repository.upsert({
        where: { fullName: repository.fullName },
        update: {
          name: repository.name,
          visibility: repository.visibility,
          defaultBranch: repository.defaultBranch,
          archived: repository.archived,
          organizationId: organization.id,
        },
        create: {
          name: repository.name,
          fullName: repository.fullName,
          visibility: repository.visibility,
          defaultBranch: repository.defaultBranch,
          archived: repository.archived,
          organizationId: organization.id,
        },
      });

      await prisma.repositorySetting.upsert({
        where: { repositoryId: savedRepository.id },
        update: repository.settings,
        create: {
          repositoryId: savedRepository.id,
          ...repository.settings,
        },
      });
    }

    ctx.logger.info("Seeded demo repository inventory", {
      organizationId: organization.id,
      controlId: control.id,
      repositoryCount: demoRepositories.length,
    });

    return {
      status: "success",
      message: "Seeded demo repository inventory.",
      recordsProcessed: demoRepositories.length,
    };
  },
  async evaluate(ctx) {
    const { prisma } = await import("@appsec-workbench/db");

    ctx.logger.info("Evaluating demo repository inventory");

    const control = await prisma.control.upsert({
      where: { key: "demo-repo-security-baseline" },
      update: {
        name: "Demo Repository Security Baseline",
        description: "Checks basic repository security settings for demo data.",
      },
      create: {
        key: "demo-repo-security-baseline",
        name: "Demo Repository Security Baseline",
        description: "Checks basic repository security settings for demo data.",
      },
    });

    const repositories = await prisma.repository.findMany({
      where: {
        organization: {
          login: "demo-org",
        },
      },
      include: {
        setting: true,
      },
      orderBy: {
        fullName: "asc",
      },
    });

    const results: ControlEvaluationResult[] = repositories.map((repository) => {
      const hasBaseline =
        repository.setting?.hasBranchProtection === true &&
        repository.setting?.hasDependabotAlerts === true &&
        repository.setting?.hasSecretScanning === true;

      return {
        repositoryId: repository.id,
        controlId: control.id,
        status: hasBaseline ? "pass" : "fail",
        message: hasBaseline
          ? `${repository.fullName} meets the demo security baseline.`
          : `${repository.fullName} is missing one or more demo security settings.`,
        evidence: {
          fullName: repository.fullName,
          archived: repository.archived,
          hasBranchProtection: repository.setting?.hasBranchProtection ?? null,
          hasDependabotAlerts: repository.setting?.hasDependabotAlerts ?? null,
          hasSecretScanning: repository.setting?.hasSecretScanning ?? null,
          hasCodeScanning: repository.setting?.hasCodeScanning ?? null,
        },
      };
    });

    ctx.logger.info("Completed demo repository evaluation", {
      resultCount: results.length,
    });

    return results;
  },
};
