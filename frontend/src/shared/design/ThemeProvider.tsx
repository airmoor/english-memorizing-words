import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { lightTheme } from './themes/light'
import { sepiaTheme } from './themes/sepia'
import { darkTheme } from './themes/dark'
import { midnightTheme } from './themes/midnight'
import type { ThemeVars } from './tokens'

export type ThemeName = 'light' | 'sepia' | 'dark' | 'midnight'

export interface ThemeMeta {
  name: ThemeName
  label: string
  /** Single-glyph icon used by the theme cycle button. */
  icon: string
}

export const THEME_ORDER: ThemeMeta[] = [
  { name: 'light',    label: 'Light',    icon: '☀️' },
  { name: 'sepia',    label: 'Sepia',    icon: '📜' },
  { name: 'dark',     label: 'Dark',     icon: '🌙' },
  { name: 'midnight', label: 'Midnight', icon: '🌌' },
]

interface ThemeContextValue {
  theme: ThemeName
  meta: ThemeMeta
  /** Cycles to the next theme in THEME_ORDER. */
  toggleTheme: () => void
  /** Sets a specific theme directly (e.g. for a settings dropdown). */
  setTheme: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const themes: Record<ThemeName, ThemeVars> = {
  light: lightTheme,
  sepia: sepiaTheme,
  dark: darkTheme,
  midnight: midnightTheme,
}

const STORAGE_KEY = 'lexis.theme'

function applyTheme(vars: ThemeVars) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

/**
 * Resolves the initial theme. Priority:
 *   1. `lexis.theme` in localStorage (user's explicit choice)
 *   2. `prefers-color-scheme: dark`  → 'dark'
 *   3. otherwise                     → 'light'
 *
 * The OS-level signal is consulted only on first visit; once the user picks
 * a theme it sticks via localStorage and we never override their choice.
 */
function resolveInitialTheme(): ThemeName {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored && stored in themes) return stored as ThemeName
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(resolveInitialTheme)

  useEffect(() => {
    applyTheme(themes[theme])
    document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // localStorage may be unavailable (private browsing) — fail silently
    }
  }, [theme])

  const meta = THEME_ORDER.find((m) => m.name === theme) ?? THEME_ORDER[0]

  function toggleTheme() {
    const idx = THEME_ORDER.findIndex((m) => m.name === theme)
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length]
    setThemeState(next.name)
  }

  function setTheme(name: ThemeName) {
    setThemeState(name)
  }

  return (
    <ThemeContext.Provider value={{ theme, meta, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
