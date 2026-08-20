import { OnboardingFlow } from '../../features/onboarding/ui/OnboardingFlow'
import styles from './OnboardingPage.module.css'

export function OnboardingPage() {
  return (
    <div className={styles.page}>
      <OnboardingFlow />
    </div>
  )
}
