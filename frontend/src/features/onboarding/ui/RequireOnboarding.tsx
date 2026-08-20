import { Navigate } from 'react-router-dom'
import { useProfile } from '../../profile/model/useProfile'

/**
 * Gates authenticated routes behind onboarding completion. "Complete" today
 * just means a native language is set — the only step in ONBOARDING_STEPS —
 * so existing accounts that never visited Settings get routed through it
 * once, same as brand-new signups. Nest inside RequireAuth (assumes a token
 * already exists) and do not wrap the /onboarding route itself with this.
 *
 * Does not block on the profile fetch: the page below mounts immediately and
 * shows its own skeleton while profile loads in parallel with page queries.
 * Waiting here used to paint a spinner, unmount it, then fade the page in
 * from opacity 0 — a blank gap on first load.
 */
export function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { data: profile, isPending } = useProfile()

  if (!isPending && profile?.nativeLanguageCode === null) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}
