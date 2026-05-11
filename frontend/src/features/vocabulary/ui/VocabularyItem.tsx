import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
import { Card } from '../../../shared/ui/Card/Card'
import { Text } from '../../../shared/ui/Typography/Typography'
import { useWordDetail } from '../../../shared/ui/WordDetail/WordDetailContext'
import styles from './VocabularyItem.module.css'

interface Props {
  item: VocabularyWord
  onRemove: (wordId: string) => void
  /** All word IDs in the current list, in display order. Used for panel navigation. */
  sourceList: string[]
}

/**
 * A single vocabulary entry row.
 *
 * Clicking the main body opens WordDetailContainer via useWordDetail.
 * The remove button is preserved and does not open the panel.
 *
 * NOTE: This is the Phase 1 wiring layer. Phase 2 will replace this with
 * VocabularyRow — an editorial row with 72–88px height, definition snippet,
 * living library signals, and ⋯ action menu.
 */
export function VocabularyItem({ item, onRemove, sourceList }: Props) {
  const { open, activeWordId } = useWordDetail()
  const isActive = activeWordId === item.wordId

  const handleOpen = () => {
    open(item.wordId, sourceList)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation() // prevent triggering the row open
    onRemove(item.wordId)
  }

  return (
    <Card as="li" padding="md" interactive className={styles.item}>
      {/* Main row body — opens word detail */}
      <button
        className={styles.rowButton}
        onClick={handleOpen}
        aria-label={`Open detail for ${item.wordText}`}
        aria-pressed={isActive}
      >
        <div className={styles.wordRow}>
          <Text variant="label" as="span" className={styles.word}>
            {item.wordText}
          </Text>
          {item.transcription && (
            <span className={styles.transcription}>/{item.transcription}/</span>
          )}
          {isActive && <span className={styles.activeDot} aria-hidden="true" />}
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
      </button>

      {/* Remove button — independent of row open */}
      <button
        className={styles.removeBtn}
        onClick={handleRemove}
        aria-label={`Remove ${item.wordText}`}
        title="Remove from vocabulary"
      >
        ✕
      </button>
    </Card>
  )
}
