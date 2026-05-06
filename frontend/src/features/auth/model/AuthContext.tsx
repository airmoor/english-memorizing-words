import { createContext, useContext, useState, type ReactNode } from 'react'
import { tokenStore } from '../../../shared/lib/tokenStore'

interface AuthState {
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  function login(token: string) {
    tokenStore.set(token)
    setIsAuthenticated(true)
  }

  function logout() {
    tokenStore.clear()
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
