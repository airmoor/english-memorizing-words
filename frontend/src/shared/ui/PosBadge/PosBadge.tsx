import styles from './PosBadge.module.css'

interface Props {
  /** The part-of-speech label (e.g. "noun", "verb"). Rendered uppercase via CSS. */
  pos: string
  className?: string
}

/**
 * Canonical part-of-speech badge.
 *
 * Filled accent background, uppercase micro text — matches the MeaningGroup
 * treatment across Search, Vocabulary, Review, and MeaningPicker surfaces.
 *
 * Replaces the four divergent local implementations that used inconsistent
 * outlined/lowercase styles.
 */
export function PosBadge({ pos, className }: Props) {
  return (
    <span className={[styles.badge, className].filter(Boolean).join(' ')}>
      {pos}
    </span>
  )
}
