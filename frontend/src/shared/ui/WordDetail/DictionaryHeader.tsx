import type { WordPayload, LearningState } from './types'
import { Text } from '../Typography/Typography'
import { Button } from '../Button/Button'
import styles from './DictionaryHeader.module.css'

interface Props {
  word: Pick<WordPayload, 'text' | 'transcription'>
  /** Determines save vs. remove action. Null = word not saved. */
  learningState: LearningState | null
  onSave: () => void
  onRemove: () => void
  isMutating?: boolean
  /**
   * In 'vocabulary' context all words are already saved — the save/remove
   * action area is hidden. The container chrome (SidePanel ×, BottomSheet
   * close button) provides the close action instead.
   */
  context?: 'vocabulary' | 'search'
}

/**
 * The top section of a word detail view.
 *
 * Renders: word text · transcription · source attribution · save/remove action.
 *
 * - When learningState is null: shows "Save word" button
 * - When learningState is non-null: shows "Saved ✓" badge (click to remove)
 *
 * Dictionary layer only — receives no learning data beyond the boolean
 * save state implied by learningState !== null.
 */
export function DictionaryHeader({
  word,
  learningState,
  onSave,
  onRemove,
  isMutating = false,
  context = 'search',
}: Props) {
  const isSaved = learningState !== null

  return (
    <header className={styles.header}>
      <div className={styles.wordBlock}>
        <Text variant="heading" as="h2" className={styles.word}>
          {word.text}
        </Text>
        {word.transcription && (
          <Text variant="caption" color="secondary" as="span" className={styles.transcription}>
            /{word.transcription}/
          </Text>
        )}
      </div>

      {/* Action area: hidden in vocabulary context (panel chrome handles close);
          shows save/remove in search context. */}
      {context !== 'vocabulary' && (
        isSaved ? (
          <button
            className={styles.savedBadge}
            onClick={onRemove}
            disabled={isMutating}
            aria-label={`Remove ${word.text} from vocabulary`}
            title="Click to remove from vocabulary"
          >
            Saved ✓
          </button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={onSave}
            disabled={isMutating}
            className={styles.saveButton}
          >
            {isMutating ? 'Saving…' : 'Save word'}
          </Button>
        )
      )}
    </header>
  )
}
