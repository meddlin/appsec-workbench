import type { PrismaClient } from "@appsec-workbench/db";

export const supportedFindingSources = ["secret-scanning"] as const;
export const supportedSecretScanningStates = ["open", "resolved"] as const;

export type FindingSource = (typeof supportedFindingSources)[number];
export type SecretScanningState =
  (typeof supportedSecretScanningStates)[number];

export interface SecretScanningFindingOutput {
  repository: string;
  githubNumber: number;
  secretType: string;
  secretTypeDisplayName: string | null;
  state: string;
  validity: string | null;
  resolution: string | null;
  location: string;
  htmlUrl: string | null;
  lastSeenAt: string;
}

interface FindingsOutputWriter {
  log(message: string): void;
  table(rows: readonly Record<string, unknown>[]): void;
}

export function parseFindingSource(value: string): FindingSource {
  if (value === "secret-scanning") {
    return value;
  }

  throw new Error(
    `Unsupported findings source: ${value}. Supported sources: ${supportedFindingSources.join(", ")}.`,
  );
}

export function parseSecretScanningState(
  value: string | undefined,
): SecretScanningState | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "open" || value === "resolved") {
    return value;
  }

  throw new Error(
    `Unsupported secret-scanning state: ${value}. Supported states: ${supportedSecretScanningStates.join(", ")}.`,
  );
}

export function formatFindingLocation(
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

  if (endLine !== null && endLine !== startLine) {
    return `${path}:${startLine}-${endLine}`;
  }

  return `${path}:${startLine}`;
}

export async function listSecretScanningFindings(
  prisma: Pick<PrismaClient, "secretScanningAlert">,
  state?: SecretScanningState,
): Promise<SecretScanningFindingOutput[]> {
  const alerts = await prisma.secretScanningAlert.findMany({
    where: state ? { state } : undefined,
    select: {
      githubNumber: true,
      secretType: true,
      secretTypeDisplayName: true,
      state: true,
      validity: true,
      resolution: true,
      path: true,
      startLine: true,
      endLine: true,
      htmlUrl: true,
      lastSeenAt: true,
      repository: {
        select: {
          fullName: true,
        },
      },
    },
    orderBy: [
      { state: "asc" },
      { lastSeenAt: "desc" },
      { repository: { fullName: "asc" } },
      { githubNumber: "asc" },
    ],
  });

  return alerts.map((alert) => ({
    repository: alert.repository.fullName,
    githubNumber: alert.githubNumber,
    secretType: alert.secretType,
    secretTypeDisplayName: alert.secretTypeDisplayName,
    state: alert.state,
    validity: alert.validity,
    resolution: alert.resolution,
    location: formatFindingLocation(
      alert.path,
      alert.startLine,
      alert.endLine,
    ),
    htmlUrl: alert.htmlUrl,
    lastSeenAt: alert.lastSeenAt.toISOString(),
  }));
}

export function printSecretScanningFindings(
  findings: readonly SecretScanningFindingOutput[],
  json: boolean,
  output: FindingsOutputWriter = {
    log: (message) => console.log(message),
    table: (rows) => console.table(rows),
  },
): void {
  if (json) {
    output.log(JSON.stringify(findings, null, 2));
    return;
  }

  if (findings.length === 0) {
    output.log("No secret-scanning findings found.");
    return;
  }

  output.table(
    findings.map((finding) => ({
      Repository: finding.repository,
      Alert: finding.githubNumber,
      "Secret Type": finding.secretTypeDisplayName ?? finding.secretType,
      State: finding.state,
      Validity: finding.validity ?? "-",
      Resolution: finding.resolution ?? "-",
      Location: finding.location,
      "Last Seen": finding.lastSeenAt,
    })),
  );
}
