import { prisma } from "@github-inventory/db";
import Link from "next/link";
import {
  dependabotStateClassName,
  formatDateTime,
  formatDependabotState,
  severityClassName,
} from "../ui";

export const dynamic = "force-dynamic";

export default async function DependabotAlertsPage() {
  const [alerts, totalCount, openCount, criticalCount, highCount] =
    await Promise.all([
      prisma.dependabotAlert.findMany({
        include: {
          repository: true,
        },
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
      }),
      prisma.dependabotAlert.count(),
      prisma.dependabotAlert.count({
        where: {
          state: "open",
        },
      }),
      prisma.dependabotAlert.count({
        where: {
          severity: "critical",
        },
      }),
      prisma.dependabotAlert.count({
        where: {
          severity: "high",
        },
      }),
    ]);

  return (
    <>
      <div className="page-header">
        <h1>Dependabot Alerts</h1>
        <p>GitHub Dependabot vulnerability alerts synced into the local database.</p>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">Total Alerts</div>
          <div className="metric-value">{totalCount}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Open Alerts</div>
          <div className="metric-value">{openCount}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Critical</div>
          <div className="metric-value">{criticalCount}</div>
        </div>
        <div className="metric">
          <div className="metric-label">High</div>
          <div className="metric-value">{highCount}</div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="empty">No Dependabot alerts recorded.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Repository</th>
                <th>Package</th>
                <th>Ecosystem</th>
                <th>Severity</th>
                <th>State</th>
                <th>Advisory</th>
                <th>Manifest</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>
                    <Link className="table-link" href={`/repositories/${alert.repositoryId}`}>
                      {alert.repository.fullName}
                    </Link>
                  </td>
                  <td>{alert.packageName ?? "-"}</td>
                  <td>{alert.ecosystem ?? "-"}</td>
                  <td>
                    {alert.severity ? (
                      <span className={`badge ${severityClassName(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <span className={`badge ${dependabotStateClassName(alert.state)}`}>
                      {formatDependabotState(alert.state)}
                    </span>
                  </td>
                  <td>
                    {alert.htmlUrl ? (
                      <a className="table-link" href={alert.htmlUrl}>
                        {alert.ghsaId ?? alert.cveId ?? `#${alert.githubNumber}`}
                      </a>
                    ) : (
                      (alert.ghsaId ?? alert.cveId ?? `#${alert.githubNumber}`)
                    )}
                  </td>
                  <td>{alert.manifestPath ?? "-"}</td>
                  <td>{formatDateTime(alert.githubUpdatedAt ?? alert.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
