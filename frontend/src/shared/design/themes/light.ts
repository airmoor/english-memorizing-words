import type { ThemeVars } from '../tokens'

// Calm light. Flat off-white surfaces, Ink Amber accent.
export const lightTheme: ThemeVars = {
  '--color-bg-primary':   '#fcfcfd',
  '--color-bg-secondary': '#ffffff',
  '--color-bg-card':      '#ffffff',
  '--color-text-primary':   '#18181b',
  '--color-text-secondary': '#52525b',
  '--color-accent':       '#e0a03c',
  '--color-accent-hover': '#d2902e',
  '--color-accent-text':  '#1a1206',
  '--color-accent-fg':    '#9a6500', // darkened — amber is unreadable on white
  '--color-accent-subtle':'#fbf3e2',
  '--color-border':       '#e8e8ec',
  '--color-danger':       '#dc2626',
  '--color-success':      '#15803d',
  '--color-warning':      '#b45309',
  // Gradients deprecated — resolve to the accent so any residual fill is calm.
  '--gradient-a':         '#e0a03c',
  '--gradient-b':         '#d2902e',
  '--gradient-c':         '#e0a03c',
  '--gradient-glow':      'transparent',
}
