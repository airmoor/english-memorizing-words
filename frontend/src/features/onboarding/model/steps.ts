import type { ComponentType } from 'react'
import { LanguageStep } from '../ui/steps/LanguageStep'

export interface OnboardingStepProps {
  /** Advance to the next step, or finish onboarding if this was the last one. */
  onComplete: () => void
}

export interface OnboardingStepConfig {
  id: string
  component: ComponentType<OnboardingStepProps>
}

/**
 * Ordered steps rendered by OnboardingFlow. Today there's only the native
 * language picker — RequireOnboarding treats "onboarded" as "language is
 * set", so adding a step here alone isn't enough to make it required; see
 * RequireOnboarding.tsx if a future step needs its own completion signal.
 */
export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  { id: 'native-language', component: LanguageStep },
]
