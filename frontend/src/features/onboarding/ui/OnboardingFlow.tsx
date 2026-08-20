import { useSearchParams } from 'react-router-dom'
import { useNavigate } from '../../../shared/lib/useAppNavigate'
import { ONBOARDING_STEPS } from '../model/steps'

/**
 * Drives ONBOARDING_STEPS in order. Current step index lives in the `step`
 * query param (not local state) so back/forward and refresh behave sanely
 * on a step other than the first — same rationale as the rest of the app's
 * URL-driven UI state.
 */
export function OnboardingFlow() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const requested = Number(searchParams.get('step') ?? '0')
  const index = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 0), ONBOARDING_STEPS.length - 1)
    : 0
  const step = ONBOARDING_STEPS[index]

  function handleComplete() {
    const nextIndex = index + 1
    if (nextIndex < ONBOARDING_STEPS.length) {
      setSearchParams({ step: String(nextIndex) })
    } else {
      navigate('/home')
    }
  }

  const Step = step.component
  return <Step onComplete={handleComplete} />
}
