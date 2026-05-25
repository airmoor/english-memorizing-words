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
   * action area is hidden. Pass onClose to render the × inline on this header row.
   */
  context?: 'vocabulary' | 'search'
  /**
   * When provided (vocabulary + sidePanel only), renders an inline × close
   * button on the right side of this header — same row as the word title.
   */
  onClose?: () => void
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
      </div>

      {/* Action area — three cases:
          1. vocabulary + onClose: inline × button aligned with the word title
          2. search + saved: "Saved ✓" badge
          3. search + unsaved: "Save word" button */}
      {context === 'vocabulary' ? (
        onClose ? (
          <button
            className={styles.panelCloseBtn}
            onClick={onClose}
            aria-label="Close word detail"
          >
            <CloseIcon />
          </button>
        ) : null
      ) : (
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

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
