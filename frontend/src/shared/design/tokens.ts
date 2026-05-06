// Semantic CSS variable names — the single source of truth for what tokens exist.
// Components reference these; themes provide the actual values.

export const tokens = {
  color: {
    bgPrimary:     'var(--color-bg-primary)',
    bgSecondary:   'var(--color-bg-secondary)',
    bgCard:        'var(--color-bg-card)',
    textPrimary:   'var(--color-text-primary)',
    textSecondary: 'var(--color-text-secondary)',
    accent:        'var(--color-accent)',
    accentHover:   'var(--color-accent-hover)',
    accentSubtle:  'var(--color-accent-subtle)',
    border:        'var(--color-border)',
    danger:        'var(--color-danger)',
    success:       'var(--color-success)',
    warning:       'var(--color-warning)',
  },
  space: {
    xs:  'var(--space-xs)',
    sm:  'var(--space-sm)',
    md:  'var(--space-md)',
    lg:  'var(--space-lg)',
    xl:  'var(--space-xl)',
    xxl: 'var(--space-xxl)',
  },
  radius: {
    sm:   'var(--radius-sm)',
    md:   'var(--radius-md)',
    lg:   'var(--radius-lg)',
    full: 'var(--radius-full)',
  },
  shadow: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
  },
  font: {
    xs:  'var(--font-xs)',
    sm:  'var(--font-sm)',
    md:  'var(--font-md)',
    lg:  'var(--font-lg)',
    xl:  'var(--font-xl)',
    xxl: 'var(--font-xxl)',
  },
  weight: {
    regular:  'var(--fw-regular)',
    medium:   'var(--fw-medium)',
    semibold: 'var(--fw-semibold)',
    bold:     'var(--fw-bold)',
  },
} as const

// The shape every theme must satisfy
export type ThemeVars = Record<string, string>
