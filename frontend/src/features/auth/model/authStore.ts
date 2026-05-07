import { create } from 'zustand'
import { tokenStore } from '../../../shared/lib/tokenStore'

interface AuthStore {
  token: string | null
  isInitialized: boolean
  setToken: (token: string) => void
  clearToken: () => void
  setInitialized: () => void
}

export const useAuthStore = create<AuthStore>()((set) => {
  // Keep Zustand state in sync with tokenStore (used by silent refresh in base.ts)
  tokenStore.subscribe((t) => set({ token: t }))

  return {
    token: null,
    isInitialized: false,
    setToken: (t) => tokenStore.set(t),
    clearToken: () => tokenStore.clear(),
    setInitialized: () => set({ isInitialized: true }),
  }
})
