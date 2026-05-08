import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { lightTheme }          from './themes/light'
import { sepiaTheme }          from './themes/sepia'
import { darkTheme }           from './themes/dark'
import { midnightTheme }       from './themes/midnight'
import { marshmallowTheme }    from './themes/marshmallow'
import { arcticGlassTheme }    from './themes/arcticGlass'
import { solarEditorialTheme } from './themes/solarEditorial'
import { violetLibraryTheme }  from './themes/violetLibrary'
import { emeraldDepthsTheme }  from './themes/emeraldDepths'
import { sakuraNightTheme }    from './themes/sakuraNight'
import { neonTheme }           from './themes/neon'
import type { ThemeVars } from './tokens'

// ── Two-axis theme model ────────────────────────────────────────────────────
//
//   mode          — brightness preference ('system' resolves via matchMedia)
//   lightVariant  — which palette when the effective mode is 'light'
//   darkVariant   — which palette when the effective mode is 'dark'
//
// Resolved theme key drives all CSS variables; one of:
//   'light' | 'sepia' | 'marshmallow' | 'arcticGlass' | 'solarEditorial'
//   'dark'  | 'midnight' | 'violetLibrary' | 'emeraldDepths' | 'sakuraNight' | 'neon'

export type ThemeMode = 'light' | 'dark' | 'system'

export type LightVariant =
  | 'standard'
  | 'sepia'
  | 'marshmallow'
  | 'arcticGlass'
  | 'solarEditorial'

export type DarkVariant =
  | 'standard'
  | 'midnight'
  | 'violetLibrary'
  | 'emeraldDepths'
  | 'sakuraNight'
  | 'neon'

export interface ThemeSettings {
  mode: ThemeMode
  lightVariant: LightVariant
  darkVariant: DarkVariant
}

export type ResolvedTheme =
  | 'light'
  | 'sepia'
  | 'marshmallow'
  | 'arcticGlass'
  | 'solarEditorial'
  | 'dark'
  | 'midnight'
  | 'violetLibrary'
  | 'emeraldDepths'
  | 'sakuraNight'
  | 'neon'

const themes: Record<ResolvedTheme, ThemeVars> = {
  light:          lightTheme,
  sepia:          sepiaTheme,
  dark:           darkTheme,
  midnight:       midnightTheme,
  marshmallow:    marshmallowTheme,
  arcticGlass:    arcticGlassTheme,
  solarEditorial: solarEditorialTheme,
  violetLibrary:  violetLibraryTheme,
  emeraldDepths:  emeraldDepthsTheme,
  sakuraNight:    sakuraNightTheme,
  neon:           neonTheme,
}

// ── Mode options ───────────────────────────────────────────────────────────

export const MODE_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light',  label: 'Light',  icon: '☀️' },
  { value: 'dark',   label: 'Dark',   icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
]

// ── Variant option shapes ──────────────────────────────────────────────────

export interface LightVariantOption {
  value: LightVariant
  label: string
  description: string
  swatch: ResolvedTheme
}

export interface DarkVariantOption {
  value: DarkVariant
  label: string
  description: string
  swatch: ResolvedTheme
}

export const LIGHT_VARIANT_OPTIONS: LightVariantOption[] = [
  { value: 'standard',       label: 'Standard',       description: 'Clean, neutral, productive',        swatch: 'light'          },
  { value: 'sepia',          label: 'Sepia',           description: 'Warm parchment for long reading',   swatch: 'sepia'          },
  { value: 'marshmallow',    label: 'Marshmallow',     description: 'Dreamy pastel, anime aesthetic',    swatch: 'marshmallow'    },
  { value: 'arcticGlass',    label: 'Arctic Glass',    description: 'Icy minimal, ultra-clean clarity',  swatch: 'arcticGlass'    },
  { value: 'solarEditorial', label: 'Solar Editorial', description: 'Warm ivory, luxury editorial feel', swatch: 'solarEditorial' },
]

export const DARK_VARIANT_OPTIONS: DarkVariantOption[] = [
  { value: 'standard',      label: 'Standard',       description: 'Cool, calm dark',                      swatch: 'dark'          },
  { value: 'midnight',      label: 'Midnight',       description: 'Deep blue-black, late-night reading',  swatch: 'midnight'      },
  { value: 'violetLibrary', label: 'Violet Library', description: 'Mysterious literary atmosphere',       swatch: 'violetLibrary' },
  { value: 'emeraldDepths', label: 'Emerald Depths', description: 'Sophisticated ocean calm',             swatch: 'emeraldDepths' },
  { value: 'sakuraNight',   label: 'Sakura Night',   description: 'Cinematic dark sakura night',          swatch: 'sakuraNight'   },
  { value: 'neon',          label: 'Neon',           description: 'Bold modern, electric creative energy', swatch: 'neon'         },
]

// ── Storage helpers ────────────────────────────────────────────────────────

const STORAGE_KEY = 'lexis.theme.settings'
const LEGACY_KEY  = 'lexis.theme'

const VALID_LIGHT: LightVariant[] = ['standard', 'sepia', 'marshmallow', 'arcticGlass', 'solarEditorial']
const VALID_DARK:  DarkVariant[]  = ['standard', 'midnight', 'violetLibrary', 'emeraldDepths', 'sakuraNight', 'neon']

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: 'system',
  lightVariant: 'standard',
  darkVariant: 'standard',
}

// ── Pure helpers ──────────────────────────────────────────────────────────

function getSystemMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const LIGHT_MAP: Record<LightVariant, ResolvedTheme> = {
  standard:       'light',
  sepia:          'sepia',
  marshmallow:    'marshmallow',
  arcticGlass:    'arcticGlass',
  solarEditorial: 'solarEditorial',
}

const DARK_MAP: Record<DarkVariant, ResolvedTheme> = {
  standard:      'dark',
  midnight:      'midnight',
  violetLibrary: 'violetLibrary',
  emeraldDepths: 'emeraldDepths',
  sakuraNight:   'sakuraNight',
  neon:          'neon',
}

export function resolveTheme(settings: ThemeSettings): ResolvedTheme {
  const effectiveMode = settings.mode === 'system' ? getSystemMode() : settings.mode
  if (effectiveMode === 'light') return LIGHT_MAP[settings.lightVariant] ?? 'light'
  return DARK_MAP[settings.darkVariant] ?? 'dark'
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
        mode:         (['light', 'dark', 'system'] as ThemeMode[]).includes(parsed.mode as ThemeMode)
                        ? (parsed.mode as ThemeMode)
                        : DEFAULT_SETTINGS.mode,
        lightVariant: VALID_LIGHT.includes(parsed.lightVariant as LightVariant)
                        ? (parsed.lightVariant as LightVariant)
                        : DEFAULT_SETTINGS.lightVariant,
        darkVariant:  VALID_DARK.includes(parsed.darkVariant as DarkVariant)
                        ? (parsed.darkVariant as DarkVariant)
                        : DEFAULT_SETTINGS.darkVariant,
      }
    }
  } catch {
    // fall through to migration / default
  }

  // 2. Legacy migration ('lexis.theme' single-key → settings object)
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
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  setLightVariant: (v: LightVariant) => void
  setDarkVariant: (v: DarkVariant) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(loadSettings)

  useEffect(() => {
    applyTheme(resolveTheme(settings))
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // localStorage unavailable — fail silently
    }
  }, [settings])

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
    resolved:        resolveTheme(settings),
    setMode:         (mode) => setSettings((s) => ({ ...s, mode })),
    setLightVariant: (v)    => setSettings((s) => ({ ...s, lightVariant: v })),
    setDarkVariant:  (v)    => setSettings((s) => ({ ...s, darkVariant: v })),
  }

  return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
