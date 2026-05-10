import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
import { Card } from '../../../shared/ui/Card/Card'
import { Text } from '../../../shared/ui/Typography/Typography'
import styles from './VocabularyItem.module.css'

interface Props {
  item: VocabularyWord
  onRemove: (wordId: string) => void
}

export function VocabularyItem({ item, onRemove }: Props) {
  return (
    <Card as="li" padding="md" interactive className={styles.item}>
      <div className={styles.main}>
        <div className={styles.wordRow}>
          <Text variant="label" as="span" className={styles.word}>
            {item.wordText}
          </Text>
          {item.transcription && (
            <span className={styles.transcription}>/{item.transcription}/</span>
          )}
        </div>

        {item.meanings.length > 0 && (
          <ul className={styles.meanings}>
            {item.meanings.slice(0, 3).map((m) => (
              <li key={m.id} className={styles.meaning}>
                {m.partOfSpeech && (
                  <span className={styles.pos}>{m.partOfSpeech}</span>
                )}
                <Text variant="caption" color="secondary" as="span" className={styles.definition}>
                  {m.definition}
                </Text>
              </li>
            ))}
            {item.meanings.length > 3 && (
              <li className={styles.moreCount}>
                <Text variant="caption" color="secondary" as="span">
                  +{item.meanings.length - 3} more
                </Text>
              </li>
            )}
          </ul>
        )}
      </div>

      <button
        className={styles.removeBtn}
        onClick={() => onRemove(item.wordId)}
        aria-label={`Remove ${item.wordText}`}
        title="Remove from vocabulary"
      >
        ✕
      </button>
    </Card>
  )
}
