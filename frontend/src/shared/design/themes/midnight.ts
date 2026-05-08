import type { ThemeVars } from '../tokens'

/**
 * Midnight — deep blue-black, premium reading mode.
 * Lower saturation than the standard dark theme; tuned for late-night sessions.
 */
export const midnightTheme: ThemeVars = {
  '--color-bg-primary':   '#0a0e1a',
  '--color-bg-secondary': '#0f1424',
  '--color-bg-card':      '#141a2c',
  '--color-text-primary':   '#dfe4f0',
  '--color-text-secondary': '#7d869b',
  '--color-accent':       '#7dd3fc',
  '--color-accent-hover': '#38bdf8',
  '--color-accent-subtle':'#0c2a44',
  '--color-border':       '#1f2940',
  '--color-danger':       '#f87171',
  '--color-success':      '#5eead4',
  '--color-warning':      '#fbbf24',
  '--gradient-a':         '#38bdf8',
  '--gradient-b':         '#818cf8',
  '--gradient-c':         '#c4b5fd',
  '--gradient-glow':      'rgba(125, 211, 252, 0.2)',
}
