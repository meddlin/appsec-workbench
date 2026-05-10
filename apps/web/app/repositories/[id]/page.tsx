import { prisma } from "@github-inventory/db";
import { notFound } from "next/navigation";
import {
  dependabotStateClassName,
  formatBoolean,
  formatDateTime,
  formatDependabotState,
  severityClassName,
} from "../../ui";

export const dynamic = "force-dynamic";

export default async function RepositoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repository = await prisma.repository.findUnique({
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
    },
  });

  if (!repository) {
    notFound();
  }

  const openDependabotAlertCount = repository.dependabotAlerts.filter(
    (alert) => alert.state === "open",
  ).length;

  return (
    <>
      <div className="page-header">
        <h1>{repository.fullName}</h1>
        <p>Repository metadata and Dependabot alerts.</p>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">Visibility</div>
          <div className="metric-value metric-value-text">{repository.visibility}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Open Dependabot Alerts</div>
          <div className="metric-value">{openDependabotAlertCount}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Total Dependabot Alerts</div>
          <div className="metric-value">{repository.dependabotAlerts.length}</div>
        </div>
      </div>

      <section className="section">
        <h2>Repository Details</h2>
        <div className="detail-grid">
          <div>
            <span className="detail-label">Owner</span>
            <span>{repository.organization.login}</span>
          </div>
          <div>
            <span className="detail-label">Default Branch</span>
            <span>{repository.defaultBranch ?? "-"}</span>
          </div>
          <div>
            <span className="detail-label">Primary Language</span>
            <span>{repository.primaryLanguage ?? "-"}</span>
          </div>
          <div>
            <span className="detail-label">Archived</span>
            <span>{formatBoolean(repository.archived)}</span>
          </div>
          <div>
            <span className="detail-label">Branch Protection</span>
            <span>{formatBoolean(repository.setting?.hasBranchProtection)}</span>
          </div>
          <div>
            <span className="detail-label">Dependabot Alerts Enabled</span>
            <span>{formatBoolean(repository.setting?.hasDependabotAlerts)}</span>
          </div>
          <div>
            <span className="detail-label">Secret Scanning</span>
            <span>{formatBoolean(repository.setting?.hasSecretScanning)}</span>
          </div>
          <div>
            <span className="detail-label">Last Updated</span>
            <span>{formatDateTime(repository.updatedAt)}</span>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Dependabot Alerts</h2>
        {repository.dependabotAlerts.length === 0 ? (
          <div className="empty">No Dependabot alerts recorded for this repository.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Ecosystem</th>
                  <th>Severity</th>
                  <th>State</th>
                  <th>Advisory</th>
                  <th>Manifest</th>
                  <th>Patched Versions</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {repository.dependabotAlerts.map((alert) => (
                  <tr key={alert.id}>
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
                    <td>{alert.patchedVersions ?? "-"}</td>
                    <td>{formatDateTime(alert.githubUpdatedAt ?? alert.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
