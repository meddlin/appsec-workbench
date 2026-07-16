'use client';

import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle">
      <div className="theme-toggle-group">
        <button
          className={`theme-button ${theme === 'light' ? 'active' : ''}`}
          onClick={() => setTheme('light')}
          aria-label="Light mode"
          title="Light mode - Forces light theme"
        >
          <span className="theme-icon">☀️</span>
          <span className="theme-label">Light</span>
        </button>
        <button
          className={`theme-button ${theme === 'dark' ? 'active' : ''}`}
          onClick={() => setTheme('dark')}
          aria-label="Dark mode"
          title="Dark mode - Forces dark theme"
        >
          <span className="theme-icon">🌙</span>
          <span className="theme-label">Dark</span>
        </button>
      </div>
      <button
        className={`theme-button system-button ${theme === 'system' ? 'active' : ''}`}
        onClick={() => setTheme('system')}
        aria-label="System preference"
        title="System preference - Follows your device settings"
      >
        <span className="theme-icon">⚙️</span>
        <span className="theme-label">Auto</span>
      </button>
    </div>
  );
}
