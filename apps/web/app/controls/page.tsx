import { prisma } from "@appsec-workbench/db";
import type { Metadata } from "next";
import { withDatabaseUnavailableFallback } from "../db-error";
import { formatDateTime } from "../ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Controls",
};

export default async function ControlsPage() {
  return withDatabaseUnavailableFallback(ControlsContent);
}

async function ControlsContent() {
  const controls = await prisma.control.findMany({
    include: {
      _count: {
        select: {
          evaluations: true,
          findings: true,
          exceptions: true,
        },
      },
    },
    orderBy: {
      key: "asc",
    },
  });

  return (
    <div className="wide-page">
      <div className="page-header">
        <h1>Controls</h1>
        <p>Control definitions and related evaluation activity.</p>
      </div>

      {controls.length === 0 ? (
        <div className="empty">No controls recorded.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Name</th>
                <th>Description</th>
                <th>Evaluations</th>
                <th>Findings</th>
                <th>Exceptions</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {controls.map((control) => (
                <tr key={control.id}>
                  <td>{control.key}</td>
                  <td>{control.name}</td>
                  <td className="muted">{control.description ?? "-"}</td>
                  <td>{control._count.evaluations}</td>
                  <td>{control._count.findings}</td>
                  <td>{control._count.exceptions}</td>
                  <td>{formatDateTime(control.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
