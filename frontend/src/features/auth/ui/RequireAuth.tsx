import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../model/authStore'
import { Spinner } from '../../../shared/ui/Spinner'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  if (!isInitialized) return <Spinner />
  if (!token) return <Navigate to="/" replace />
  return <>{children}</>
}
