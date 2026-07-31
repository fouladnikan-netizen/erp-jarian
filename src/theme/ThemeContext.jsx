import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const THEME_STORAGE_KEY = 'jaryan-theme';
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === THEMES.DARK || stored === THEMES.LIGHT) return stored;
  } catch {
    /* ignore */
  }
  return THEMES.LIGHT;
}

function applyTheme(theme) {
  const next = theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
  document.documentElement.setAttribute('data-theme', next);
  document.documentElement.style.colorScheme = next;
  return next;
}

const ThemeContext = createContext({
  theme: THEMES.LIGHT,
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => applyTheme(readStoredTheme()));

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === THEMES.DARK,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
