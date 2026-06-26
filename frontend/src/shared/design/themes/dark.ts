import type { ThemeVars } from '../tokens'

// Calm dark (default). Flat near-black surfaces, Viridian accent.
export const darkTheme: ThemeVars = {
  '--color-bg-primary':   '#0b0b0f',
  '--color-bg-secondary': '#141419',
  '--color-bg-card':      '#16161c',
  '--color-text-primary':   '#ececee',
  '--color-text-secondary': '#a1a1aa',
  '--color-accent':       '#3f9e8d',
  '--color-accent-hover': '#378b7c',
  '--color-accent-text':  '#0a1712',
  '--color-accent-fg':    '#3f9e8d', // viridian is readable as text on dark (6.0:1)
  '--color-accent-subtle':'#102019',
  '--color-border':       '#232329',
  '--color-danger':       '#f87171',
  '--color-success':      '#4ade80',
  '--color-warning':      '#fbbf24',
  // Gradients deprecated — resolve to the accent so any residual fill is calm.
  '--gradient-a':         '#3f9e8d',
  '--gradient-b':         '#378b7c',
  '--gradient-c':         '#3f9e8d',
  '--gradient-glow':      'transparent',
}
