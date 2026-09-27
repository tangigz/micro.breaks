import { useEffect } from 'react';
import type { Theme } from '@/engine';

/**
 * The theme lives in the engine settings (shared by every page). A copy in
 * localStorage lets each page apply it before its first paint, without a flash.
 */
const KEY = 'mb-theme';

export function applyStoredTheme() {
  let theme: string | null = null;
  try {
    theme = localStorage.getItem(KEY);
  } catch {
    // Storage blocked: dark, the default.
  }
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
}

export function useTheme(theme: Theme | undefined) {
  useEffect(() => {
    if (!theme) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Not remembered for the first paint; the engine setting still applies.
    }
  }, [theme]);
}
