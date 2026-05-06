import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { lightTheme } from './themes/light'
import { darkTheme } from './themes/dark'
import type { ThemeVars } from './tokens'

export type ThemeName = 'light' | 'dark'

interface ThemeContextValue {
  theme: ThemeName
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const themes: Record<ThemeName, ThemeVars> = { light: lightTheme, dark: darkTheme }

function applyTheme(vars: ThemeVars) {
  const root = document.documentElement
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>('light')

  useEffect(() => {
    applyTheme(themes[theme])
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
