import { Navigate } from 'react-router-dom'
import { useProfile } from '../../profile/model/useProfile'
import { Spinner } from '../../../shared/ui/Spinner'

/**
 * Gates authenticated routes behind onboarding completion. "Complete" today
 * just means a native language is set — the only step in ONBOARDING_STEPS —
 * so existing accounts that never visited Settings get routed through it
 * once, same as brand-new signups. Nest inside RequireAuth (assumes a token
 * already exists) and do not wrap the /onboarding route itself with this.
 */
export function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { data: profile, isPending } = useProfile()

  if (isPending) return <Spinner />
  if (profile?.nativeLanguageCode === null) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
