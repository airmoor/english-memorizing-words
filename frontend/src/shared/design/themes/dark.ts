import type { ThemeVars } from '../tokens'

// Calm dark (default). Flat near-black surfaces, Viridian accent.
export const darkTheme: ThemeVars = {
  '--color-bg-primary':   '#0e0e11',
  '--color-bg-secondary': '#151518',
  '--color-bg-card':      '#18181c',
  '--color-text-primary':   '#ededee',
  '--color-text-secondary': '#9a9aa2',
  '--color-accent':       '#3f9e8d',
  '--color-accent-hover': '#378b7c',
  '--color-accent-text':  '#0a1712',
  '--color-accent-fg':    '#3f9e8d', // viridian is readable as text on dark (6.0:1)
  '--color-accent-subtle':'#102019',
  '--color-border':       '#26262b',
  '--color-danger':       '#f87171',
  '--color-success':      '#4ade80',
  '--color-warning':      '#fbbf24',
  // Gradients deprecated — resolve to the accent so any residual fill is calm.
  '--gradient-a':         '#3f9e8d',
  '--gradient-b':         '#378b7c',
  '--gradient-c':         '#3f9e8d',
  '--gradient-glow':      'transparent',
}
