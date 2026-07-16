import { describe, expect, it } from "vitest";
import { formatDateTime, secretScanningStateClassName } from "./ui";

describe("formatDateTime", () => {
  it("formats dates and preserves the empty-state placeholder", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime(new Date("2026-07-16T12:00:00.000Z"))).not.toBe("-");
  });
});

describe("secretScanningStateClassName", () => {
  it("styles open alerts as danger", () => {
    expect(secretScanningStateClassName("open")).toBe("danger");
  });

  it("styles resolved alerts as success", () => {
    expect(secretScanningStateClassName("resolved")).toBe("success");
  });

  it("uses warning for unknown states", () => {
    expect(secretScanningStateClassName("pending")).toBe("warning");
  });
});
