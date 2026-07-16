import { prisma } from "@appsec-workbench/db";
import Link from "next/link";
import { DatabaseUnavailable, isDatabaseUnavailableError } from "../db-error";
import {
  codeQlStateClassName,
  dependabotStateClassName,
  formatDateTime,
  formatDependabotState,
  secretScanningStateClassName,
  severityClassName,
  statusClassName,
} from "../ui";

export const dynamic = "force-dynamic";

function formatAlertLocation(
  path: string | null,
  startLine: number | null,
  endLine: number | null,
): string {
  if (!path) {
    return "-";
  }

  if (startLine === null) {
    return path;
  }

  if (endLine && endLine !== startLine) {
    return `${path}:${startLine}-${endLine}`;
  }

  return `${path}:${startLine}`;
}

export default async function FindingsPage() {
  try {
    return await FindingsContent();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }
}

async function FindingsContent() {
  const [findings, dependabotAlerts, codeQlAlerts, secretScanningAlerts] =
    await Promise.all([
    prisma.finding.findMany({
      include: {
        control: true,
        repository: true,
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          severity: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
    }),
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
    prisma.codeQlAlert.findMany({
      include: {
        repository: true,
      },
      orderBy: [
        {
          state: "asc",
        },
        {
          severity: "asc",
        },
        {
          githubUpdatedAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
    }),
    prisma.secretScanningAlert.findMany({
      include: {
        repository: true,
      },
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
    }),
  ]);

  return (
    <div className="wide-page">
      <div className="page-header">
        <h1>Findings</h1>
        <p>Actionable issues detected during module evaluation.</p>
      </div>

      <section className="section">
        <h2>Policy Findings</h2>
        {findings.length === 0 ? (
          <div className="empty">No findings recorded.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Finding</th>
                  <th>Repository</th>
                  <th>Control</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((finding) => (
                  <tr key={finding.id}>
                    <td>{finding.title}</td>
                    <td>{finding.repository.fullName}</td>
                    <td>{finding.control?.name ?? "-"}</td>
                    <td>
                      <span className={`badge ${severityClassName(finding.severity)}`}>
                        {finding.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${statusClassName(finding.status)}`}>
                        {finding.status}
                      </span>
                    </td>
                    <td>{formatDateTime(finding.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <h2>CodeQL Findings</h2>
        {codeQlAlerts.length === 0 ? (
          <div className="empty">No CodeQL findings recorded.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Repository</th>
                  <th>Rule</th>
                  <th>Severity</th>
                  <th>State</th>
                  <th>Location</th>
                  <th>Message</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {codeQlAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <Link
                        className="table-link"
                        href={`/repositories/${alert.repositoryId}`}
                      >
                        {alert.repository.fullName}
                      </Link>
                    </td>
                    <td>
                      {alert.htmlUrl ? (
                        <a className="table-link" href={alert.htmlUrl}>
                          {alert.ruleName ?? alert.ruleId ?? `#${alert.githubNumber}`}
                        </a>
                      ) : (
                        (alert.ruleName ?? alert.ruleId ?? `#${alert.githubNumber}`)
                      )}
                    </td>
                    <td>
                      <span className={`badge ${severityClassName(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${codeQlStateClassName(alert.state)}`}>
                        {formatDependabotState(alert.state)}
                      </span>
                    </td>
                    <td>
                      {formatAlertLocation(
                        alert.path,
                        alert.startLine,
                        alert.endLine,
                      )}
                    </td>
                    <td>{alert.message ?? alert.ruleDescription ?? "-"}</td>
                    <td>{formatDateTime(alert.githubUpdatedAt ?? alert.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <h2>Secret Scanning Findings</h2>
        {secretScanningAlerts.length === 0 ? (
          <div className="empty">No secret scanning findings recorded.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Repository</th>
                  <th>Secret Type</th>
                  <th>State</th>
                  <th>Validity</th>
                  <th>Resolution</th>
                  <th>First Location</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {secretScanningAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <Link className="table-link" href={`/repositories/${alert.repositoryId}`}>
                        {alert.repository.fullName}
                      </Link>
                    </td>
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
                      {formatAlertLocation(
                        alert.path,
                        alert.startLine,
                        alert.endLine,
                      )}
                    </td>
                    <td>{formatDateTime(alert.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <h2>Dependabot Findings</h2>
        {dependabotAlerts.length === 0 ? (
          <div className="empty">No Dependabot findings recorded.</div>
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
                {dependabotAlerts.map((alert) => (
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
      </section>
    </div>
  );
}
