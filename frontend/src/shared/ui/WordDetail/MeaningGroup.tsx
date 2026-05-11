import type { MeaningPayload } from './types'
import { Text } from '../Typography/Typography'
import { Sense } from '../Sense/Sense'
import { isSubSense } from './utils'
import styles from './MeaningGroup.module.css'

interface Props {
  /** Part of speech label for this group. Null when the provider has no POS data. */
  pos: string | null
  meanings: MeaningPayload[]
}

/**
 * One part-of-speech section within WordDetailContent.
 * Renders the POS label (if present) followed by an ordered list of Sense items.
 *
 * Receives only the dictionary data slice it needs — no learning state,
 * no save/remove callbacks. This enforces the §4 boundary at component level.
 */
export function MeaningGroup({ pos, meanings }: Props) {
  return (
    <section className={styles.group}>
      {pos && (
        <Text variant="label" color="secondary" as="span" className={styles.pos}>
          {pos}
        </Text>
      )}
      <ol className={styles.senses}>
        {meanings.map((meaning) => (
          <Sense
            key={meaning.id}
            meaning={meaning}
            isSubSense={isSubSense(meaning.senseNumber)}
          />
        ))}
      </ol>
    </section>
  )
}
