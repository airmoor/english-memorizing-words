import { Navigate } from 'react-router-dom'
import { useAuth } from '../model/AuthContext'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}
