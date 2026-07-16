import { describe, expect, it, vi } from "vitest";
import {
  formatFindingLocation,
  listSecretScanningFindings,
  parseFindingSource,
  parseSecretScanningState,
  printSecretScanningFindings,
  type SecretScanningFindingOutput,
} from "../src/findings";

function createPrismaMock() {
  const findMany = vi.fn<(args: unknown) => Promise<unknown[]>>();

  return {
    findMany,
    prisma: {
      secretScanningAlert: {
        findMany,
      },
    } as unknown as Parameters<typeof listSecretScanningFindings>[0],
  };
}

const finding: SecretScanningFindingOutput = {
  repository: "octo-org/repo",
  githubNumber: 42,
  secretType: "github_personal_access_token",
  secretTypeDisplayName: "GitHub Personal Access Token",
  state: "open",
  validity: "active",
  resolution: null,
  location: "config/example.env:3",
  htmlUrl: "https://github.test/octo-org/repo/security/secret-scanning/42",
  lastSeenAt: "2026-07-15T12:00:00.000Z",
};

describe("findings validation", () => {
  it("accepts the supported source and states", () => {
    expect(parseFindingSource("secret-scanning")).toBe("secret-scanning");
    expect(parseSecretScanningState(undefined)).toBeUndefined();
    expect(parseSecretScanningState("open")).toBe("open");
    expect(parseSecretScanningState("resolved")).toBe("resolved");
  });

  it("rejects unsupported sources and states", () => {
    expect(() => parseFindingSource("codeql")).toThrow(
      "Unsupported findings source: codeql",
    );
    expect(() => parseSecretScanningState("fixed")).toThrow(
      "Unsupported secret-scanning state: fixed",
    );
  });
});

describe("formatFindingLocation", () => {
  it.each([
    [null, null, null, "-"],
    ["config/example.env", null, null, "config/example.env"],
    ["config/example.env", 3, 3, "config/example.env:3"],
    ["config/example.env", 3, 5, "config/example.env:3-5"],
  ])("formats a stored location", (path, startLine, endLine, expected) => {
    expect(formatFindingLocation(path, startLine, endLine)).toBe(expected);
  });
});

describe("listSecretScanningFindings", () => {
  it("selects normalized fields, excludes raw JSON, and returns stable output", async () => {
    const { findMany, prisma } = createPrismaMock();
    findMany.mockResolvedValue([
      {
        githubNumber: 42,
        secretType: "github_personal_access_token",
        secretTypeDisplayName: "GitHub Personal Access Token",
        state: "open",
        validity: "active",
        resolution: null,
        path: "config/example.env",
        startLine: 3,
        endLine: 3,
        htmlUrl:
          "https://github.test/octo-org/repo/security/secret-scanning/42",
        lastSeenAt: new Date("2026-07-15T12:00:00Z"),
        repository: {
          fullName: "octo-org/repo",
        },
      },
    ]);

    const results = await listSecretScanningFindings(prisma);
    const query = findMany.mock.calls[0]?.[0] as {
      where?: unknown;
      select: Record<string, unknown>;
      orderBy: unknown;
    };

    expect(query.where).toBeUndefined();
    expect(query.select).not.toHaveProperty("raw");
    expect(query.select).toMatchObject({
      githubNumber: true,
      secretType: true,
      repository: { select: { fullName: true } },
    });
    expect(query.orderBy).toEqual([
      { state: "asc" },
      { lastSeenAt: "desc" },
      { repository: { fullName: "asc" } },
      { githubNumber: "asc" },
    ]);
    expect(results).toEqual([finding]);
  });

  it("applies an optional state filter", async () => {
    const { findMany, prisma } = createPrismaMock();
    findMany.mockResolvedValue([]);

    await listSecretScanningFindings(prisma, "resolved");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { state: "resolved" },
      }),
    );
  });
});

describe("printSecretScanningFindings", () => {
  it("prints a human-readable table", () => {
    const output = { log: vi.fn(), table: vi.fn() };

    printSecretScanningFindings([finding], false, output);

    expect(output.log).not.toHaveBeenCalled();
    expect(output.table).toHaveBeenCalledWith([
      {
        Repository: "octo-org/repo",
        Alert: 42,
        "Secret Type": "GitHub Personal Access Token",
        State: "open",
        Validity: "active",
        Resolution: "-",
        Location: "config/example.env:3",
        "Last Seen": "2026-07-15T12:00:00.000Z",
      },
    ]);
  });

  it("prints stable JSON, including an empty array", () => {
    const output = { log: vi.fn(), table: vi.fn() };

    printSecretScanningFindings([finding], true, output);
    expect(JSON.parse(output.log.mock.calls[0]?.[0] ?? "")).toEqual([finding]);

    output.log.mockClear();
    printSecretScanningFindings([], true, output);
    expect(output.log).toHaveBeenCalledWith("[]");
    expect(output.table).not.toHaveBeenCalled();
  });

  it("prints an empty-state message for table output", () => {
    const output = { log: vi.fn(), table: vi.fn() };

    printSecretScanningFindings([], false, output);

    expect(output.log).toHaveBeenCalledWith(
      "No secret-scanning findings found.",
    );
    expect(output.table).not.toHaveBeenCalled();
  });
});
