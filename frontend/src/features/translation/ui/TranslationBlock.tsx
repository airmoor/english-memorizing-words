import { useState, type ReactNode } from 'react'
import { Languages, Eye, EyeOff } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { useProfile } from '../../profile/model/useProfile'
import { useTranslation } from '../model/useTranslation'
import styles from './TranslationBlock.module.css'

interface Props {
  wordId: string
  /**
   * 'inline' — sits near the headword (search / vocabulary).
   * 'footer' — sits at the bottom as a fallback (review answer).
   */
  variant?: 'inline' | 'footer'
}

/**
 * Tap-to-reveal native-language gloss for a word.
 *
 * One morphing row: collapsed it reads "Show translation"; revealed, the same
 * row shows the translation itself (label → answer). No provider attribution and
 * no language label — the language is a global user setting, and the engine is
 * irrelevant to the learner. Fetched lazily only once revealed. Renders nothing
 * until the user has set a native language.
 *
 * The content fades in on every phase change (keyed by `phase`); the trailing
 * eye / eye-off icon signals show / hide. The fade is disabled under
 * prefers-reduced-motion via CSS.
 */
export function TranslationBlock({ wordId, variant = 'inline' }: Props) {
  const { data: profile } = useProfile()
  const native = profile?.nativeLanguageCode ?? null
  const [revealed, setRevealed] = useState(false)

  const query = useTranslation(wordId, native, revealed)

  // No native language chosen yet → keep the surface clean.
  if (!native) return null

  // `phase` is both the render branch and the animation key — changing it
  // remounts the content span so the fade-in replays.
  let phase: string
  let label: ReactNode
  if (!revealed) {
    phase = 'label'
    label = <span className={styles.toggleLabel}>Show translation</span>
  } else if (query.isPending) {
    phase = 'loading'
    label = <span className={styles.muted}>Translating…</span>
  } else if (query.isError) {
    phase = 'error'
    label = <span className={styles.muted}>Translation unavailable</span>
  } else if (query.data) {
    phase = 'data'
    label = (
      <span className={styles.translation} lang={native}>
        {query.data.text}
      </span>
    )
  } else {
    phase = 'empty'
    label = <span className={styles.muted}>No translation available</span>
  }

  const containerClass = [styles.block, variant === 'footer' ? styles.footer : '']
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={containerClass}
      onClick={() => setRevealed((v) => !v)}
      aria-expanded={revealed}
    >
      <Icon icon={Languages} size={15} className={styles.leadIcon} />
      <span key={phase} className={styles.content}>
        {label}
      </span>
      <Icon icon={revealed ? EyeOff : Eye} size={15} className={styles.toggleIcon} />
    </button>
  )
}
