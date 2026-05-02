import { prisma } from "@github-inventory/db";
import { formatBoolean, formatDateTime } from "../ui";

export const dynamic = "force-dynamic";

export default async function RepositoriesPage() {
  const repositories = await prisma.repository.findMany({
    include: {
      organization: true,
      setting: true,
    },
    orderBy: {
      fullName: "asc",
    },
  });

  return (
    <>
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
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {repositories.map((repository) => (
                <tr key={repository.id}>
                  <td>{repository.fullName}</td>
                  <td>{repository.organization.login}</td>
                  <td>
                    <span className="badge">{repository.visibility}</span>
                  </td>
                  <td>{repository.defaultBranch ?? "-"}</td>
                  <td>{formatBoolean(repository.archived)}</td>
                  <td>{formatBoolean(repository.setting?.hasBranchProtection)}</td>
                  <td>{formatBoolean(repository.setting?.hasSecretScanning)}</td>
                  <td>{formatDateTime(repository.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
