import { createContext, useContext } from 'react';

export const THEME_STORAGE_KEY = 'theme';

export function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  } catch {
    return false;
  }
}

export function applyTheme(dark) {
  const root = document.documentElement;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.style.colorScheme = dark ? 'dark' : 'light'; // dark scrollbars, date pickers, selects…
}

// Apply the saved choice before React renders, so there is no white flash on reload.
applyTheme(readStoredTheme());

export const ThemeContext = createContext({ dark: false, setDark: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}
