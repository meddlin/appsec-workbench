import { describe, expect, it } from "vitest";
import { secretScanningStateClassName } from "./ui";

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
