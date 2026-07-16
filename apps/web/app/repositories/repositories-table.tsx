"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatBoolean } from "../ui";
import {
  sortRepositoryRows,
  type RepositoryTableRow,
  type SortColumn,
  type SortDirection,
} from "./repository-table-model";

interface RepositoriesTableProps {
  repositories: RepositoryTableRow[];
}

export function RepositoriesTable({ repositories }: RepositoriesTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("repository");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const sortedRepositories = useMemo(
    () => sortRepositoryRows(repositories, sortColumn, sortDirection),
    [repositories, sortColumn, sortDirection],
  );

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  }

  function renderHeaderCell(label: string, column: SortColumn) {
    const isActive = sortColumn === column;
    const ariaSort = isActive
      ? sortDirection === "asc"
        ? "ascending"
        : "descending"
      : "none";

    return (
      <th aria-sort={ariaSort} scope="col">
        <button
          className="sort-button"
          onClick={() => handleSort(column)}
          title={`Sort by ${label}`}
          type="button"
        >
          <span>{label}</span>
          {isActive ? (
            <span aria-hidden="true">{sortDirection === "asc" ? "↑" : "↓"}</span>
          ) : null}
        </button>
      </th>
    );
  }

  return (
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
          {sortedRepositories.map((repository) => (
            <tr key={repository.id}>
              <td>
                <Link className="table-link" href={`/repositories/${repository.id}`}>
                  {repository.fullName}
                </Link>
              </td>
              <td>{repository.ownerLogin}</td>
              <td>
                <span className="badge">{repository.visibility}</span>
              </td>
              <td>{repository.defaultBranch ?? "-"}</td>
              <td>{formatBoolean(repository.archived)}</td>
              <td>{formatBoolean(repository.hasBranchProtection)}</td>
              <td>{formatBoolean(repository.hasSecretScanning)}</td>
              <td>{repository.openSecretAlertCount}</td>
              <td>{repository.openDependabotAlertCount}</td>
              <td>{repository.updatedAtLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
