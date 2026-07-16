import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  isDatabaseUnavailableError,
  withDatabaseUnavailableFallback,
} from "../../db-error";
import {
  dependabotStateClassName,
  formatBoolean,
  formatDateTime,
  formatDependabotState,
  secretScanningStateClassName,
  severityClassName,
} from "../../ui";
import { getRepository } from "./repository-query";

export const dynamic = "force-dynamic";

type RepositoryDetailProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: RepositoryDetailProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const repository = await getRepository(id);
    return {
      title: repository?.fullName ?? "Repository not found",
    };
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return {
        title: "Repository",
      };
    }

    throw error;
  }
}

export default async function RepositoryDetailPage({
  params,
}: RepositoryDetailProps) {
  return withDatabaseUnavailableFallback(() => RepositoryDetailContent({ params }));
}

async function RepositoryDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repository = await getRepository(id);

  if (!repository) {
    notFound();
  }

  const openDependabotAlertCount = repository.dependabotAlerts.filter(
    (alert) => alert.state === "open",
  ).length;
  const openSecretScanningAlertCount = repository.secretScanningAlerts.filter(
    (alert) => alert.state === "open",
  ).length;

  return (
    <>
      <div className="page-header">
        <h1>{repository.fullName}</h1>
        <p>Repository metadata and security findings.</p>
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
        <div className="metric">
          <div className="metric-label">Open Secret Alerts</div>
          <div className="metric-value">{openSecretScanningAlertCount}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Total Secret Alerts</div>
          <div className="metric-value">
            {repository.secretScanningAlerts.length}
          </div>
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
        <h2>Secret Scanning Alerts</h2>
        {repository.secretScanningAlerts.length === 0 ? (
          <div className="empty">
            No secret scanning alerts recorded for this repository.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Secret Type</th>
                  <th>State</th>
                  <th>Validity</th>
                  <th>Resolution</th>
                  <th>First Location</th>
                  <th>Publicly Leaked</th>
                  <th>Push Protection Bypassed</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {repository.secretScanningAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      {alert.htmlUrl ? (
                        <a className="table-link" href={alert.htmlUrl}>
                          {alert.secretTypeDisplayName ?? alert.secretType}
                        </a>
                      ) : (
                        (alert.secretTypeDisplayName ?? alert.secretType)
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${secretScanningStateClassName(alert.state)}`}
                      >
                        {formatDependabotState(alert.state)}
                      </span>
                    </td>
                    <td>{alert.validity ?? "-"}</td>
                    <td>
                      {alert.resolution
                        ? formatDependabotState(alert.resolution)
                        : "-"}
                    </td>
                    <td>
                      {alert.path
                        ? `${alert.path}${alert.startLine ? `:${alert.startLine}` : ""}`
                        : "-"}
                    </td>
                    <td>{formatBoolean(alert.publiclyLeaked)}</td>
                    <td>{formatBoolean(alert.pushProtectionBypassed)}</td>
                    <td>{formatDateTime(alert.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
