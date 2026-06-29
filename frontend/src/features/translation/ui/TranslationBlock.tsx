import { useState } from 'react'
import { Languages, ChevronDown, ChevronUp } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { useProfile } from '../../profile/model/useProfile'
import { useTranslation } from '../model/useTranslation'
import { languageLabel } from '../../../shared/lib/languages'
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
 * Tap-to-reveal native-language gloss for a word. Collapsed by default so the
 * learner engages with the English first; the translation is fetched lazily
 * only once revealed. Renders nothing until the user has set a native language.
 */
export function TranslationBlock({ wordId, variant = 'inline' }: Props) {
  const { data: profile } = useProfile()
  const native = profile?.nativeLanguageCode ?? null
  const [revealed, setRevealed] = useState(false)

  const query = useTranslation(wordId, native, revealed)

  // No native language chosen yet → keep the surface clean.
  if (!native) return null

  const langName = languageLabel(native)
  const containerClass = [styles.block, variant === 'footer' ? styles.footer : '']
    .filter(Boolean)
    .join(' ')

  if (!revealed) {
    return (
      <button
        type="button"
        className={containerClass}
        onClick={() => setRevealed(true)}
        aria-expanded={false}
      >
        <Icon icon={Languages} size={15} className={styles.leadIcon} />
        <span className={styles.toggleLabel}>Show translation</span>
        <span className={styles.langTag}>{langName}</span>
        <Icon icon={ChevronDown} size={15} className={styles.chevron} />
      </button>
    )
  }

  return (
    <div className={containerClass}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setRevealed(false)}
        aria-expanded
      >
        <Icon icon={Languages} size={15} className={styles.leadIcon} />
        <span className={styles.langTag}>{langName}</span>
        <Icon icon={ChevronUp} size={15} className={styles.chevron} />
      </button>

      <div className={styles.body}>
        {query.isPending && (
          <span className={styles.muted}>Translating…</span>
        )}

        {query.isError && (
          <span className={styles.muted}>Translation unavailable right now.</span>
        )}

        {query.isSuccess && query.data === null && (
          <span className={styles.muted}>No translation available.</span>
        )}

        {query.data && (
          <>
            <span className={styles.translation} lang={native}>
              {query.data.text}
            </span>
            <span className={styles.attribution}>via {query.data.provider}</span>
          </>
        )}
      </div>
    </div>
  )
}
