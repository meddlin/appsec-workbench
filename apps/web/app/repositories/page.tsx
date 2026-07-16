import { prisma } from "@appsec-workbench/db";
import Link from "next/link";
import { DatabaseUnavailable, isDatabaseUnavailableError } from "../db-error";
import { formatBoolean, formatDateTime } from "../ui";

export const dynamic = "force-dynamic";

export default async function RepositoriesPage() {
  try {
    return await RepositoriesContent();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }
}

async function RepositoriesContent() {
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
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Repository</th>
                <th>Owner</th>
                <th>Visibility</th>
                <th>Default Branch</th>
                <th>Archived</th>
                <th>Branch Protection</th>
                <th>Secret Scanning</th>
                <th>Open Secret Alerts</th>
                <th>Open Dependabot Alerts</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {repositories.map((repository) => {
                const openDependabotAlertCount = repository.dependabotAlerts.filter(
                  (alert) => alert.state === "open",
                ).length;
                const openSecretScanningAlertCount =
                  repository.secretScanningAlerts.filter(
                    (alert) => alert.state === "open",
                  ).length;

                return (
                  <tr key={repository.id}>
                    <td>
                      <Link className="table-link" href={`/repositories/${repository.id}`}>
                        {repository.fullName}
                      </Link>
                    </td>
                    <td>{repository.organization.login}</td>
                    <td>
                      <span className="badge">{repository.visibility}</span>
                    </td>
                    <td>{repository.defaultBranch ?? "-"}</td>
                    <td>{formatBoolean(repository.archived)}</td>
                    <td>{formatBoolean(repository.setting?.hasBranchProtection)}</td>
                    <td>{formatBoolean(repository.setting?.hasSecretScanning)}</td>
                    <td>{openSecretScanningAlertCount}</td>
                    <td>{openDependabotAlertCount}</td>
                    <td>{formatDateTime(repository.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
