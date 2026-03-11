import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type HubTheme = 'light' | 'dark' | 'high-contrast';

interface ThemeContextValue {
  theme: HubTheme;
  setTheme: (theme: HubTheme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = 'hub-theme';
const THEME_ORDER: HubTheme[] = ['light', 'dark', 'high-contrast'];

function isValidTheme(value: string | null): value is HubTheme {
  return value === 'light' || value === 'dark' || value === 'high-contrast';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<HubTheme>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    return isValidTheme(stored) ? stored : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.hubTheme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: HubTheme) => {
    setThemeState(newTheme);
  };

  const cycleTheme = () => {
    setThemeState(current => {
      const idx = THEME_ORDER.indexOf(current);
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
