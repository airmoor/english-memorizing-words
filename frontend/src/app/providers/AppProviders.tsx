import { type ReactNode, useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../../shared/design/ThemeProvider'
import { useAuthStore } from '../../features/auth/model/authStore'
import { refreshToken } from '../../shared/api/base'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function AuthBootstrap({ children }: { children: ReactNode }) {
  const setInitialized = useAuthStore((s) => s.setInitialized)

  useEffect(() => {
    // Attempt to restore session from httpOnly refresh cookie on every page load.
    // Always resolves — on failure isInitialized is still set so RequireAuth
    // can redirect to /login instead of showing a spinner forever.
    //
    // `cancelled` guard: React StrictMode double-invokes effects (mount →
    // unmount → mount). Without this guard, the cleanup of the first invocation
    // races with both `setInitialized` calls. The `cancelled` flag ensures only
    // the active (second) invocation marks the app as initialized, while the
    // stale first invocation's callback is discarded.
    //
    // The underlying `refreshToken()` is a singleton promise (see base.ts), so
    // both invocations share one network request — the server only sees one
    // refresh attempt regardless of StrictMode.
    let cancelled = false
    refreshToken().finally(() => {
      if (!cancelled) setInitialized()
    })
    return () => { cancelled = true }
  }, [setInitialized])

  return <>{children}</>
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthBootstrap>
            {children}
          </AuthBootstrap>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}
