import type { WordPayload, LearningState } from './types'
import { Text } from '../Typography/Typography'
import { Button } from '../Button/Button'
import styles from './DictionaryHeader.module.css'

interface Props {
  word: Pick<WordPayload, 'text' | 'transcription' | 'provider'>
  /** Determines save vs. remove action. Null = word not saved. */
  learningState: LearningState | null
  onSave: () => void
  onRemove: () => void
  isMutating?: boolean
  /**
   * When provided, replaces the save/remove action with a close × button.
   * Used in vocabulary context where all words are already saved and the
   * "Saved ✓" badge is redundant — the close button provides a cleaner action.
   */
  onClose?: () => void
}

const PROVIDER_LABELS: Record<string, string> = {
  'merriam-webster': "Merriam-Webster Learner's",
  'free-dictionary': 'Free Dictionary',
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
  onClose,
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
        <Text variant="caption" color="secondary" as="span">
          {PROVIDER_LABELS[word.provider] ?? word.provider}
        </Text>
      </div>

      {/* Action area: vocabulary context shows close ×; search context shows save/remove */}
      {onClose ? (
        <button
          className={styles.headerCloseBtn}
          onClick={onClose}
          aria-label="Close word detail"
          title="Close (Esc)"
        >
          ×
        </button>
      ) : isSaved ? (
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
      )}
    </header>
  )
}
