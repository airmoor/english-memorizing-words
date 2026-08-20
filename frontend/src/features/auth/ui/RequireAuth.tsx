import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../model/authStore'
import { Spinner } from '../../../shared/ui/Spinner'
import { PageLayout } from '../../../shared/ui/layout/PageLayout'
import { Container } from '../../../shared/ui/layout/Container'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  // Same shell (header + container) the eventual page uses, so the nav bar
  // doesn't pop in/out between this check, RequireOnboarding's check, and
  // the page's own skeleton — see PageLayout/Container docs on eliminating
  // cross-route layout jump.
  if (!isInitialized) {
    return (
      <PageLayout>
        <Container as="main"><Spinner /></Container>
      </PageLayout>
    )
  }
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
