import { prisma } from "@appsec-workbench/db";
import { cache } from "react";

export const getRepository = cache(async (id: string) => {
  return prisma.repository.findUnique({
    where: {
      id,
    },
    include: {
      organization: true,
      setting: true,
      dependabotAlerts: {
        orderBy: [
          {
            state: "asc",
          },
          {
            githubUpdatedAt: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
      },
      secretScanningAlerts: {
        orderBy: [
          {
            state: "asc",
          },
          {
            githubCreatedAt: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
      },
    },
  });
});
