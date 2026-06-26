import type { ThemeVars } from '../tokens'

// Calm dark (default). Flat near-black surfaces, Ink Amber accent.
export const darkTheme: ThemeVars = {
  '--color-bg-primary':   '#0b0b0f',
  '--color-bg-secondary': '#141419',
  '--color-bg-card':      '#16161c',
  '--color-text-primary':   '#ececee',
  '--color-text-secondary': '#a1a1aa',
  '--color-accent':       '#e0a03c',
  '--color-accent-hover': '#d2902e',
  '--color-accent-text':  '#1a1206',
  '--color-accent-fg':    '#e0a03c', // amber is readable as text on dark (8.3:1)
  '--color-accent-subtle':'#241b0b',
  '--color-border':       '#232329',
  '--color-danger':       '#f87171',
  '--color-success':      '#4ade80',
  '--color-warning':      '#fbbf24',
  // Gradients deprecated — resolve to the accent so any residual fill is calm.
  '--gradient-a':         '#e0a03c',
  '--gradient-b':         '#d2902e',
  '--gradient-c':         '#e0a03c',
  '--gradient-glow':      'transparent',
}
