import type { VocabularyEntry } from '../../../entities/word/model/types'
import { Text } from '../../../shared/ui/Typography/Typography'
import styles from './VocabularyItem.module.css'

interface Props {
  item: VocabularyEntry
  onRemove: (meaningId: string) => void
}

export function VocabularyItem({ item, onRemove }: Props) {
  return (
    <li className={styles.item}>
      <div className={styles.main}>
        <div className={styles.wordRow}>
          <Text variant="label" as="span" className={styles.word}>
            {item.wordText}
          </Text>
          {item.partOfSpeech && (
            <span className={styles.pos}>{item.partOfSpeech}</span>
          )}
        </div>

        <Text variant="caption" color="secondary" as="p" className={styles.definition}>
          {item.definition}
        </Text>
      </div>

      <button
        className={styles.removeBtn}
        onClick={() => onRemove(item.meaningId)}
        aria-label={`Remove ${item.wordText}`}
        title="Remove from vocabulary"
      >
        ✕
      </button>
    </li>
  )
}
