import type { ThemeVars } from '../tokens'

// Calm light. Flat off-white surfaces, Viridian accent.
export const lightTheme: ThemeVars = {
  '--color-bg-primary':   '#fcfcfd',
  '--color-bg-secondary': '#ffffff',
  '--color-bg-card':      '#ffffff',
  '--color-text-primary':   '#18181b',
  '--color-text-secondary': '#52525b',
  '--color-accent':       '#3f9e8d',
  '--color-accent-hover': '#378b7c',
  '--color-accent-text':  '#0a1712',
  '--color-accent-fg':    '#347e6e', // darkened — bright viridian is unreadable on white
  '--color-accent-subtle':'#edf5f2',
  '--color-border':       '#e8e8ec',
  '--color-danger':       '#dc2626',
  '--color-success':      '#15803d',
  '--color-warning':      '#b45309',
  // Gradients deprecated — resolve to the accent so any residual fill is calm.
  '--gradient-a':         '#3f9e8d',
  '--gradient-b':         '#378b7c',
  '--gradient-c':         '#3f9e8d',
  '--gradient-glow':      'transparent',
}
