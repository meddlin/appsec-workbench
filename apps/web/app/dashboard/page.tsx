import { prisma } from "@appsec-workbench/db";
import { DatabaseUnavailable, isDatabaseUnavailableError } from "../db-error";
import { formatDateTime, statusClassName } from "../ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    return await DashboardContent();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }
}

async function DashboardContent() {
  const [
    repositoryCount,
    policyFindingCount,
    codeQlFindingCount,
    dependabotFindingCount,
    failingControls,
    latestModuleRuns,
  ] = await Promise.all([
    prisma.repository.count(),
    prisma.finding.count(),
    prisma.codeQlAlert.count(),
    prisma.dependabotAlert.count(),
    prisma.controlEvaluation.findMany({
      distinct: ["controlId"],
      select: {
        controlId: true,
      },
      where: {
        status: "fail",
      },
    }),
    prisma.moduleRun.findMany({
      orderBy: {
        startedAt: "desc",
      },
      take: 5,
    }),
  ]);
  const findingCount = policyFindingCount + codeQlFindingCount + dependabotFindingCount;

  return (
    <div className="wide-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Current inventory and AppSec evaluation summary.</p>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="metric-label">Repositories</div>
          <div className="metric-value">{repositoryCount}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Findings</div>
          <div className="metric-value">{findingCount}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Failing Controls</div>
          <div className="metric-value">{failingControls.length}</div>
        </div>
      </div>

      <section className="section">
        <h2>Latest Module Runs</h2>
        {latestModuleRuns.length === 0 ? (
          <div className="empty">No module runs recorded.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Finished</th>
                </tr>
              </thead>
              <tbody>
                {latestModuleRuns.map((run) => (
                  <tr key={run.id}>
                    <td>{run.moduleId}</td>
                    <td>
                      <span className={`badge ${statusClassName(run.status)}`}>
                        {run.status}
                      </span>
                    </td>
                    <td>{formatDateTime(run.startedAt)}</td>
                    <td>{formatDateTime(run.finishedAt)}</td>
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
