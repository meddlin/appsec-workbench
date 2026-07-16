'use client';

import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle">
      <button
        className={`theme-button ${theme === 'light' ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        aria-label="Light mode"
        title="Light mode"
      >
        ☀️
      </button>
      <button
        className={`theme-button ${theme === 'system' ? 'active' : ''}`}
        onClick={() => setTheme('system')}
        aria-label="System preference"
        title="System preference"
      >
        ⚙️
      </button>
      <button
        className={`theme-button ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        aria-label="Dark mode"
        title="Dark mode"
      >
        🌙
      </button>
    </div>
  );
}
