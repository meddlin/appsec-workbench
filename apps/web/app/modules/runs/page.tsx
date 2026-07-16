import { prisma } from "@appsec-workbench/db";
import type { Metadata } from "next";
import { withDatabaseUnavailableFallback } from "../../db-error";
import { formatDateTime, statusClassName } from "../../ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Module Runs",
};

export default async function ModuleRunsPage() {
  return withDatabaseUnavailableFallback(ModuleRunsContent);
}

async function ModuleRunsContent() {
  const runs = await prisma.moduleRun.findMany({
    include: {
      organization: true,
      repository: true,
    },
    orderBy: {
      startedAt: "desc",
    },
    take: 100,
  });

  return (
    <div className="wide-page">
      <div className="page-header">
        <h1>Module Runs</h1>
        <p>Recent ingestion and evaluation run history.</p>
      </div>

      {runs.length === 0 ? (
        <div className="empty">No module runs recorded.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Module</th>
                <th>Status</th>
                <th>Organization</th>
                <th>Repository</th>
                <th>Started</th>
                <th>Finished</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>{run.moduleId}</td>
                  <td>
                    <span className={`badge ${statusClassName(run.status)}`}>
                      {run.status}
                    </span>
                  </td>
                  <td>{run.organization?.login ?? "-"}</td>
                  <td>{run.repository?.fullName ?? "-"}</td>
                  <td>{formatDateTime(run.startedAt)}</td>
                  <td>{formatDateTime(run.finishedAt)}</td>
                  <td className="muted">{run.error ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
