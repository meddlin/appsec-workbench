import { describe, expect, it } from "vitest";
import { isThemePreference, resolveTheme } from "./theme";

describe("isThemePreference", () => {
  it.each(["light", "dark", "system"])("accepts %s", (theme) => {
    expect(isThemePreference(theme)).toBe(true);
  });

  it.each([null, "", "auto", "LIGHT"])("rejects %s", (theme) => {
    expect(isThemePreference(theme)).toBe(false);
  });
});

describe("resolveTheme", () => {
  it("preserves explicit preferences", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("resolves the system preference from the media query", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
