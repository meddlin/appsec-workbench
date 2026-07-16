"use client";

import { prisma } from "@appsec-workbench/db";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DatabaseUnavailable, isDatabaseUnavailableError } from "../db-error";
import { formatBoolean, formatDateTime } from "../ui";

export const dynamic = "force-dynamic";

type SortColumn = 
  | "repository" 
  | "owner" 
  | "visibility" 
  | "defaultBranch" 
  | "archived" 
  | "branchProtection" 
  | "secretScanning" 
  | "openSecretAlerts" 
  | "openDependabotAlerts" 
  | "updated";

type SortDirection = "asc" | "desc";

interface RepositoryData {
  id: string;
  fullName: string;
  visibility: string;
  defaultBranch: string | null;
  archived: boolean;
  updatedAt: Date;
  organization: {
    login: string;
  };
  setting: {
    hasBranchProtection: boolean | null;
    hasSecretScanning: boolean | null;
  } | null;
  dependabotAlerts: Array<{
    state: string;
  }>;
  secretScanningAlerts: Array<{
    state: string;
  }>;
}

export default async function RepositoriesPage() {
  try {
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

    return <RepositoriesContent initialRepositories={repositories} />;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }
}

function RepositoriesContent({ initialRepositories }: { initialRepositories: RepositoryData[] }) {
  const [repositories, setRepositories] = useState<RepositoryData[]>(initialRepositories);
  const [sortColumn, setSortColumn] = useState<SortColumn>("repository");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    const sorted = [...repositories].sort((a, b) => {
      let aVal: string | number | boolean | Date | null = null;
      let bVal: string | number | boolean | Date | null = null;

      switch (sortColumn) {
        case "repository":
          aVal = a.fullName;
          bVal = b.fullName;
          break;
        case "owner":
          aVal = a.organization.login;
          bVal = b.organization.login;
          break;
        case "visibility":
          aVal = a.visibility;
          bVal = b.visibility;
          break;
        case "defaultBranch":
          aVal = a.defaultBranch || "";
          bVal = b.defaultBranch || "";
          break;
        case "archived":
          aVal = a.archived ? 1 : 0;
          bVal = b.archived ? 1 : 0;
          break;
        case "branchProtection":
          aVal = a.setting?.hasBranchProtection ? 1 : 0;
          bVal = b.setting?.hasBranchProtection ? 1 : 0;
          break;
        case "secretScanning":
          aVal = a.setting?.hasSecretScanning ? 1 : 0;
          bVal = b.setting?.hasSecretScanning ? 1 : 0;
          break;
        case "openSecretAlerts":
          aVal = a.secretScanningAlerts.filter((alert) => alert.state === "open").length;
          bVal = b.secretScanningAlerts.filter((alert) => alert.state === "open").length;
          break;
        case "openDependabotAlerts":
          aVal = a.dependabotAlerts.filter((alert) => alert.state === "open").length;
          bVal = b.dependabotAlerts.filter((alert) => alert.state === "open").length;
          break;
        case "updated":
          aVal = a.updatedAt;
          bVal = b.updatedAt;
          break;
      }

      // Handle null values
      if (aVal === null || aVal === "") aVal = sortDirection === "asc" ? -Infinity : Infinity;
      if (bVal === null || bVal === "") bVal = sortDirection === "asc" ? -Infinity : Infinity;

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      return sortDirection === "asc" ? comparison : -comparison;
    });

    setRepositories(sorted);
  }, [sortColumn, sortDirection]);

  const SortIndicator = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return null;
    }
    return <span style={{ marginLeft: "4px" }}>{sortDirection === "asc" ? "↑" : "↓"}</span>;
  };

  const renderHeaderCell = (label: string, column: SortColumn) => (
    <th 
      onClick={() => handleSort(column)}
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      title={`Sort by ${label}`}
    >
      {label}
      <SortIndicator column={column} />
    </th>
  );

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
                {renderHeaderCell("Repository", "repository")}
                {renderHeaderCell("Owner", "owner")}
                {renderHeaderCell("Visibility", "visibility")}
                {renderHeaderCell("Default Branch", "defaultBranch")}
                {renderHeaderCell("Archived", "archived")}
                {renderHeaderCell("Branch Protection", "branchProtection")}
                {renderHeaderCell("Secret Scanning", "secretScanning")}
                {renderHeaderCell("Open Secret Alerts", "openSecretAlerts")}
                {renderHeaderCell("Open Dependabot Alerts", "openDependabotAlerts")}
                {renderHeaderCell("Updated", "updated")}
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
