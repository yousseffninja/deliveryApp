/**
 * Design tokens shared by every screen. Inspired by the DriverTrack design
 * system: one strong blue for primary actions, semantic tints for sync and
 * delivery states, generous cards on a cool grey background.
 */
export const theme = {
  colors: {
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
    slate: '#475569',
    slateBg: '#EEF2F7',
    white: '#FFFFFF',
  },
  radius: { sm: 8, md: 12, lg: 16 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  typography: { title: 20, body: 14, small: 12, tiny: 10 },
} as const;

export type Theme = typeof theme;
