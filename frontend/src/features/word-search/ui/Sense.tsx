import { Text } from '../../../shared/ui/Typography/Typography'
import type { Meaning } from '../../../entities/word/model/types'
import styles from './Sense.module.css'

interface Props {
  meaning: Meaning
  /** True when the sense_number is a sub-sense (e.g. "1a", "1b") so we can indent. */
  isSubSense: boolean
}

/**
 * Renders a single sense inside a dictionary entry.
 * Save state is managed at the word level — no per-sense save button.
 */
export function Sense({ meaning, isSubSense }: Props) {
  return (
    <li className={[styles.sense, isSubSense ? styles.subSense : ''].join(' ')}>
      <div className={styles.row}>
        {meaning.senseNumber && (
          <span className={styles.senseNumber}>{meaning.senseNumber}</span>
        )}

        <div className={styles.body}>
          <Text variant="body" as="p" className={styles.definition}>
            {meaning.definition}
          </Text>

          {meaning.examples.length > 0 && (
            <ul className={styles.examples}>
              {meaning.examples.slice(0, 3).map((ex, i) => (
                <li key={i} className={styles.example}>
                  <Text variant="caption" color="secondary" as="span">
                    "{ex}"
                  </Text>
                </li>
              ))}
            </ul>
          )}

          {meaning.synonyms.length > 0 && (
            <div className={styles.synonyms}>
              {meaning.synonyms.slice(0, 8).map((syn) => (
                <span key={syn} className={styles.synonym}>{syn}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
