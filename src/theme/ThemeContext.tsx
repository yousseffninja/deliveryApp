import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { makeTheme, Theme, ThemeModePreference } from './index';
import { useAppStore } from '../store/useAppStore';

const ThemeContext = createContext<Theme>(makeTheme(false));

/**
 * Resolves the user's appearance preference (light / dark / system) against
 * the OS color scheme and hands every screen a themed palette. Reading the
 * preference from the store keeps the choice persistent across restarts.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useAppStore(s => s.themeMode) as ThemeModePreference;
  const scheme = useColorScheme();

  const theme = useMemo(() => {
    const isDark =
      preference === 'system' ? scheme === 'dark' : preference === 'dark';
    return makeTheme(isDark);
  }, [preference, scheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
