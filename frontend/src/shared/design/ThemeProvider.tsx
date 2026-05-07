import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { lightTheme } from './themes/light'
import { sepiaTheme } from './themes/sepia'
import { darkTheme } from './themes/dark'
import { midnightTheme } from './themes/midnight'
import type { ThemeVars } from './tokens'

// ── Two-axis theme model ────────────────────────────────────────────────────
//
//   mode          — brightness preference ('system' resolves via matchMedia)
//   lightVariant  — which palette to use when the effective mode is 'light'
//   darkVariant   — which palette to use when the effective mode is 'dark'
//
// Resolved theme key (the one that actually drives CSS variables) is one of:
//   'light' | 'sepia' | 'dark' | 'midnight'
// derived from { mode, lightVariant, darkVariant } + OS preference.

export type ThemeMode = 'light' | 'dark' | 'system'
export type LightVariant = 'standard' | 'sepia'
export type DarkVariant = 'standard' | 'midnight'

export interface ThemeSettings {
  mode: ThemeMode
  lightVariant: LightVariant
  darkVariant: DarkVariant
}

export type ResolvedTheme = 'light' | 'sepia' | 'dark' | 'midnight'

const themes: Record<ResolvedTheme, ThemeVars> = {
  light: lightTheme,
  sepia: sepiaTheme,
  dark: darkTheme,
  midnight: midnightTheme,
}

export const MODE_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light',  label: 'Light',  icon: '☀️' },
  { value: 'dark',   label: 'Dark',   icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
]

export const LIGHT_VARIANT_OPTIONS: { value: LightVariant; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Clean, neutral, productive' },
  { value: 'sepia',    label: 'Sepia',    description: 'Warm parchment for long reading' },
]

export const DARK_VARIANT_OPTIONS: { value: DarkVariant; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Cool, calm dark' },
  { value: 'midnight', label: 'Midnight', description: 'Deep blue-black, late-night reading' },
]

const STORAGE_KEY = 'lexis.theme.settings'
const LEGACY_KEY = 'lexis.theme'

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: 'system',
  lightVariant: 'standard',
  darkVariant: 'standard',
}

// ── Pure helpers (exported for tests / Settings page preview) ──────────────

function getSystemMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(settings: ThemeSettings): ResolvedTheme {
  const effectiveMode = settings.mode === 'system' ? getSystemMode() : settings.mode
  if (effectiveMode === 'light') {
    return settings.lightVariant === 'sepia' ? 'sepia' : 'light'
  }
  return settings.darkVariant === 'midnight' ? 'midnight' : 'dark'
}

// ── Storage + migration ────────────────────────────────────────────────────

function loadSettings(): ThemeSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS

  // 1. New format
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemeSettings>
      return {
        mode: ['light', 'dark', 'system'].includes(parsed.mode as string)
          ? (parsed.mode as ThemeMode)
          : DEFAULT_SETTINGS.mode,
        lightVariant: ['standard', 'sepia'].includes(parsed.lightVariant as string)
          ? (parsed.lightVariant as LightVariant)
          : DEFAULT_SETTINGS.lightVariant,
        darkVariant: ['standard', 'midnight'].includes(parsed.darkVariant as string)
          ? (parsed.darkVariant as DarkVariant)
          : DEFAULT_SETTINGS.darkVariant,
      }
    }
  } catch {
    // fall through to migration / default
  }

  // 2. Migration from legacy single-key format ('lexis.theme' → settings)
  try {
    const legacy = window.localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const migrated = migrateLegacy(legacy as ResolvedTheme)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      window.localStorage.removeItem(LEGACY_KEY)
      return migrated
    }
  } catch {
    // ignore
  }

  return DEFAULT_SETTINGS
}

function migrateLegacy(legacy: ResolvedTheme): ThemeSettings {
  switch (legacy) {
    case 'light':    return { mode: 'light', lightVariant: 'standard', darkVariant: 'standard' }
    case 'sepia':    return { mode: 'light', lightVariant: 'sepia',    darkVariant: 'standard' }
    case 'dark':     return { mode: 'dark',  lightVariant: 'standard', darkVariant: 'standard' }
    case 'midnight': return { mode: 'dark',  lightVariant: 'standard', darkVariant: 'midnight' }
    default:         return DEFAULT_SETTINGS
  }
}

function applyTheme(name: ResolvedTheme) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(themes[name])) {
    root.style.setProperty(key, value)
  }
  root.setAttribute('data-theme', name)
}

// ── React Context ──────────────────────────────────────────────────────────

interface ThemeContextValue {
  settings: ThemeSettings
  /** The actual palette currently driving CSS vars (for inspection / preview). */
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  setLightVariant: (v: LightVariant) => void
  setDarkVariant: (v: DarkVariant) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(loadSettings)

  // Apply theme + persist on every settings change
  useEffect(() => {
    applyTheme(resolveTheme(settings))
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // localStorage unavailable (private browsing) — fail silently
    }
  }, [settings])

  // Live-update when system theme changes AND user is on 'system' mode
  useEffect(() => {
    if (settings.mode !== 'system') return
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(resolveTheme(settings))
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings])

  const ctx: ThemeContextValue = {
    settings,
    resolved: resolveTheme(settings),
    setMode: (mode) => setSettings((s) => ({ ...s, mode })),
    setLightVariant: (v) => setSettings((s) => ({ ...s, lightVariant: v })),
    setDarkVariant: (v) => setSettings((s) => ({ ...s, darkVariant: v })),
  }

  return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
