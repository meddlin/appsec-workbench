import { prisma } from "@appsec-workbench/db";
import { DatabaseUnavailable, isDatabaseUnavailableError } from "../db-error";
import { RepositoriesTable } from "./repositories-table";

export const dynamic = "force-dynamic";

export default async function RepositoriesPage() {
  try {
    const repositories = await prisma.repository.findMany({
      include: {
        organization: true,
        setting: true,
        dependabotAlerts: {
          select: {
            state: true,
          },
        },
        secretScanningAlerts: {
          select: {
            state: true,
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
          <RepositoriesTable repositories={repositories} />
        )}
      </div>
    );
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }
}
