export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") {
    return prefersDark ? "dark" : "light";
  }

  return preference;
}

export const themeInitializationScript = `(() => {
  let preference = "system";
  try {
    const storedPreference = localStorage.getItem("theme");
    if (["light", "dark", "system"].includes(storedPreference)) {
      preference = storedPreference;
    }
  } catch {}

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedTheme = preference === "system"
    ? (prefersDark ? "dark" : "light")
    : preference;

  document.documentElement.dataset.themePreference = preference;
  if (resolvedTheme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
})();`;
