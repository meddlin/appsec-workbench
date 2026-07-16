import { prisma } from "@appsec-workbench/db";
import type { Metadata } from "next";
import { withDatabaseUnavailableFallback } from "../db-error";
import { toRepositoryTableRow } from "./repository-table-data";
import { RepositoriesTable } from "./repositories-table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Repositories",
};

export default async function RepositoriesPage() {
  return withDatabaseUnavailableFallback(async () => {
    const repositories = await prisma.repository.findMany({
      select: {
        id: true,
        fullName: true,
        visibility: true,
        defaultBranch: true,
        archived: true,
        updatedAt: true,
        organization: {
          select: {
            login: true,
          },
        },
        setting: {
          select: {
            hasBranchProtection: true,
            hasSecretScanning: true,
          },
        },
        _count: {
          select: {
            dependabotAlerts: {
              where: {
                state: "open",
              },
            },
            secretScanningAlerts: {
              where: {
                state: "open",
              },
            },
          },
        },
      },
      orderBy: {
        fullName: "asc",
      },
    });

    return (
      <div className="wide-page">
        <div className="page-header">
          <h1>Repositories</h1>
          <p>Repository inventory stored in the local database.</p>
        </div>

        {repositories.length === 0 ? (
          <div className="empty">No repositories found.</div>
        ) : (
          <RepositoriesTable repositories={repositories.map(toRepositoryTableRow)} />
        )}
      </div>
    );
  });
}
