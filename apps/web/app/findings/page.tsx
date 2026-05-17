import { prisma } from "@github-inventory/db";
import { formatDateTime, severityClassName, statusClassName } from "../ui";

export const dynamic = "force-dynamic";

export default async function FindingsPage() {
  const findings = await prisma.finding.findMany({
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
  });

  return (
    <div className="wide-page">
      <div className="page-header">
        <h1>Findings</h1>
        <p>Actionable issues detected during module evaluation.</p>
      </div>

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
    </div>
  );
}
