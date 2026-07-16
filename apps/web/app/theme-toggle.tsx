"use client";

import { useEffect, useState } from "react";
import {
  isThemePreference,
  resolveTheme,
  type ThemePreference,
} from "./theme";

function applyTheme(preference: ThemePreference, prefersDark: boolean) {
  const root = document.documentElement;
  root.dataset.themePreference = preference;

  if (resolveTheme(preference, prefersDark) === "dark") {
    root.dataset.theme = "dark";
  } else {
    delete root.dataset.theme;
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference | null>(null);

  useEffect(() => {
    let storedTheme: string | null = null;
    try {
      storedTheme = localStorage.getItem("theme");
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }

    setTheme(isThemePreference(storedTheme) ? storedTheme : "system");
  }, []);

  useEffect(() => {
    if (!theme) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateResolvedTheme = () => applyTheme(theme, mediaQuery.matches);

    updateResolvedTheme();
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // The DOM theme still works when persistence is unavailable.
    }

    if (theme !== "system") {
      return;
    }

    mediaQuery.addEventListener("change", updateResolvedTheme);
    return () => mediaQuery.removeEventListener("change", updateResolvedTheme);
  }, [theme]);

  const isMounting = theme === null;

  return (
    <div className="theme-toggle" aria-label="Color theme" role="group">
      <div className="theme-toggle-group">
        <button
          aria-label="Light mode"
          aria-pressed={theme === "light"}
          className={`theme-button ${theme === "light" ? "active" : ""}`}
          disabled={isMounting}
          onClick={() => setTheme("light")}
          title="Light mode - Forces light theme"
          type="button"
        >
          <span className="theme-icon" aria-hidden="true">☀️</span>
          <span className="theme-label">Light</span>
        </button>
        <button
          aria-label="Dark mode"
          aria-pressed={theme === "dark"}
          className={`theme-button ${theme === "dark" ? "active" : ""}`}
          disabled={isMounting}
          onClick={() => setTheme("dark")}
          title="Dark mode - Forces dark theme"
          type="button"
        >
          <span className="theme-icon" aria-hidden="true">🌙</span>
          <span className="theme-label">Dark</span>
        </button>
      </div>
      <button
        aria-label="System preference"
        aria-pressed={theme === "system"}
        className={`theme-button system-button ${theme === "system" ? "active" : ""}`}
        disabled={isMounting}
        onClick={() => setTheme("system")}
        title="System preference - Follows your device settings"
        type="button"
      >
        <span className="theme-icon" aria-hidden="true">⚙️</span>
        <span className="theme-label">Auto</span>
      </button>
    </div>
  );
}
