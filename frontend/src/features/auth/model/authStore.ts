import { create } from 'zustand'
import { tokenStore } from '../../../shared/lib/tokenStore'
import { scheduleProactiveRefresh } from '../../../shared/api/base'

interface AuthStore {
  token: string | null
  isInitialized: boolean
  setToken: (token: string) => void
  clearToken: () => void
  setInitialized: () => void
}

export const useAuthStore = create<AuthStore>()((set) => {
  // Keep Zustand state in sync with tokenStore (used by silent refresh in base.ts).
  // When a non-null token arrives (login or silent refresh), also schedule the
  // proactive pre-expiry refresh so the access token is rotated before it
  // expires — preventing the concurrent-401 race that caused unexpected logouts.
  tokenStore.subscribe((t) => {
    set({ token: t })
    if (t) scheduleProactiveRefresh(t)
  })

  return {
    token: null,
    isInitialized: false,
    setToken: (t) => tokenStore.set(t),    // triggers subscriber above
    clearToken: () => tokenStore.clear(),  // triggers subscriber (t = null → no schedule)
    setInitialized: () => set({ isInitialized: true }),
  }
})
