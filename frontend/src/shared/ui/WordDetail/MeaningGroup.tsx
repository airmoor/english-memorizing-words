import type { MeaningPayload } from './types'
import { Sense } from '../Sense/Sense'
import { PosBadge } from '../PosBadge/PosBadge'
import { isSubSense } from './utils'
import styles from './MeaningGroup.module.css'

interface Props {
  /** Part of speech label for this group. Null when the provider has no POS data. */
  pos: string | null
  meanings: MeaningPayload[]
  selectionMode?: boolean
  selectedIds?: string[]
  onToggle?: (id: string) => void
  /** IDs of meanings already in the user's vocabulary — drives the saved highlight. */
  savedMeaningIds?: string[]
  onSeeAlso?: (term: string) => void
}

/**
 * One part-of-speech section within WordDetailContent.
 * Renders the POS label (if present) followed by an ordered list of Sense items.
 *
 * Receives only the dictionary data slice it needs — no learning state,
 * no save/remove callbacks. This enforces the §4 boundary at component level.
 */
export function MeaningGroup({ pos, meanings, selectionMode, selectedIds, onToggle, savedMeaningIds, onSeeAlso }: Props) {
  // Assign auto-incrementing integer counters to top-level senses only.
  // Sub-senses (e.g. "1a", "1b") get counter: null and are indented instead.
  let counter = 0
  const withCounters = meanings.map((meaning) => {
    const sub = isSubSense(meaning.senseNumber)
    return { meaning, isSubSense: sub, counter: sub ? null : ++counter }
  })

  return (
    <section className={styles.group}>
      {pos && <PosBadge pos={pos} />}
      <ol className={styles.senses}>
        {withCounters.map(({ meaning, isSubSense: sub, counter: c }) => (
          <Sense
            key={meaning.id}
            meaning={meaning}
            isSubSense={sub}
            counter={c}
            selectionMode={selectionMode}
            isSelected={selectedIds?.includes(meaning.id)}
            onToggle={onToggle}
            isSavedMeaning={savedMeaningIds?.includes(meaning.id)}
            onSeeAlso={onSeeAlso}
          />
        ))}
      </ol>
    </section>
  )
}
