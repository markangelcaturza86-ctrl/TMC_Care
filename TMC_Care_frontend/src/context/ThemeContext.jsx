import { useCallback, useEffect, useState } from 'react';
import { ThemeContext, THEME_STORAGE_KEY, applyTheme, readStoredTheme } from '../hooks/useTheme';

export function ThemeProvider({ children }) {
  const [dark, setDarkState] = useState(readStoredTheme);

  const setDark = useCallback((value) => {
    setDarkState(value);
    applyTheme(value);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value ? 'dark' : 'light');
    } catch {
      // storage blocked — the theme still works for this session
    }
  }, []);

  useEffect(() => { applyTheme(dark); }, [dark]);

  return <ThemeContext.Provider value={{ dark, setDark }}>{children}</ThemeContext.Provider>;
}
