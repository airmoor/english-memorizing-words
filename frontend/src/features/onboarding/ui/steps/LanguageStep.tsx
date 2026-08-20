import { useState } from 'react'
import { Card } from '../../../../shared/ui/Card/Card'
import { Button } from '../../../../shared/ui/Button/Button'
import { Text } from '../../../../shared/ui/Typography/Typography'
import { Stack } from '../../../../shared/ui/Stack/Stack'
import { Logo } from '../../../../shared/ui/Logo/Logo'
import { SelectMenu, type SelectMenuOption } from '../../../../shared/ui/SelectMenu/SelectMenu'
import { SUPPORTED_LANGUAGES } from '../../../../shared/lib/languages'
import { useUpdateNativeLanguage } from '../../../profile/model/useProfile'
import { useLogout } from '../../../auth/model/useLogout'
import type { OnboardingStepProps } from '../../model/steps'
import styles from './LanguageStep.module.css'

const LANGUAGE_OPTIONS: SelectMenuOption<string>[] = SUPPORTED_LANGUAGES.map((lang) => ({
  value: lang.code,
  label: lang.label,
}))

/** Best-effort guess from the browser locale ("ru-RU" -> "ru"); empty if unsupported. */
function guessLanguage(): string {
  const primary = navigator.language?.split('-')[0]?.toLowerCase() ?? ''
  return SUPPORTED_LANGUAGES.some((l) => l.code === primary) ? primary : ''
}

export function LanguageStep({ onComplete }: OnboardingStepProps) {
  const [selected, setSelected] = useState(guessLanguage)
  const updateLanguage = useUpdateNativeLanguage()
  const logout = useLogout()

  async function handleContinue() {
    if (!selected) return
    await updateLanguage.mutateAsync(selected)
    onComplete()
  }

  return (
    <div className={styles.wrapper}>
      <Stack gap="md" align="center" className={styles.header}>
        <Logo size={44} />
        <Text variant="title" as="h1">What's your native language?</Text>
        <Text variant="body" color="secondary" as="p" className={styles.subtitle}>
          We'll use it to show translations on your word cards and during review.
        </Text>
      </Stack>

      <Card variant="flat" padding="lg" className={styles.card}>
        <Stack gap="md">
          <SelectMenu
            value={selected}
            options={LANGUAGE_OPTIONS}
            ariaLabel="Native language"
            placeholder="Choose a language"
            onChange={setSelected}
            fullWidth
          />
          {updateLanguage.isError && (
            <Text variant="caption" color="danger" as="p">Couldn't save. Try again.</Text>
          )}
          <Button
            fullWidth
            disabled={!selected}
            isLoading={updateLanguage.isPending}
            onClick={handleContinue}
          >
            Continue
          </Button>
        </Stack>
      </Card>

      <Text variant="caption" color="secondary" as="p" className={styles.footnote}>
        Wrong account?{' '}
        <button type="button" onClick={logout} className={styles.link}>Log out</button>
      </Text>
    </div>
  )
}
