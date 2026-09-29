/**
 * Design tokens shared by every screen. Two full palettes (light and dark)
 * expose the same token names, so components can switch appearance without
 * branching on colors anywhere in their render code.
 */

export type ThemeModePreference = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  bg: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
  conflict: string;
  conflictBg: string;
  slate: string;
  slateBg: string;
  white: string;
  /** tinted background for "selected" rows/cards */
  selectedBg: string;
  /** near-opaque background for bottom action bars */
  actionBarBg: string;
}

export const lightColors: ThemeColors = {
  primary: '#1D5DF2',
  primaryDark: '#174BC4',
  primarySoft: '#E8EFFE',
  bg: '#F3F5FA',
  card: '#FFFFFF',
  border: '#E4E9F2',
  text: '#101B33',
  textMuted: '#64748B',
  success: '#12A150',
  successBg: '#E6F7EE',
  warning: '#B45309',
  warningBg: '#FEF3C7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  info: '#1D4ED8',
  infoBg: '#DBEAFE',
  conflict: '#7E22CE',
  conflictBg: '#F3E8FF',
  slate: '#475569',
  slateBg: '#EEF2F7',
  white: '#FFFFFF',
  selectedBg: '#F5F9FF',
  actionBarBg: 'rgba(243,245,250,0.97)',
};

export const darkColors: ThemeColors = {
  primary: '#5B8DEF',
  primaryDark: '#82AAF5',
  primarySoft: '#16263F',
  bg: '#0B1220',
  card: '#111B2E',
  border: '#1E2A44',
  text: '#E8EEF9',
  textMuted: '#8DA0BF',
  success: '#34D399',
  successBg: '#0C2A22',
  warning: '#FBBF24',
  warningBg: '#2B2108',
  danger: '#F87171',
  dangerBg: '#321212',
  info: '#60A5FA',
  infoBg: '#10203F',
  conflict: '#C084FC',
  conflictBg: '#2A1245',
  slate: '#94A3B8',
  slateBg: '#1A2439',
  white: '#FFFFFF',
  selectedBg: '#16263F',
  actionBarBg: 'rgba(11,18,32,0.97)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16 } as const;
export const typography = { title: 20, body: 14, small: 12, tiny: 10 } as const;

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}

export function makeTheme(isDark: boolean): Theme {
  return { colors: isDark ? darkColors : lightColors, isDark };
}

/** Kept for tests and tooling; UI components should use useTheme(). */
export const theme = makeTheme(false);
