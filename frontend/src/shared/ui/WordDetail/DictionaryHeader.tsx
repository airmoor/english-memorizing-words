import { useState } from 'react'
import { X } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import type { WordPayload, LearningState } from './types'
import { Text } from '../Typography/Typography'
import { Button } from '../Button/Button'
import { PronunciationButton } from '../../../features/pronunciation/ui/PronunciationButton'
import styles from './DictionaryHeader.module.css'

interface Props {
  word: Pick<WordPayload, 'id' | 'text' | 'transcription'>
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
  /**
   * When provided in search context, clicking "Saved ✓" opens edit mode
   * instead of removing the word.
   */
  onEdit?: () => void
  /**
   * When provided, renders a "View in vocabulary →" link below the "Saved ✓" badge.
   */
  onViewInVocabulary?: () => void
}

/**
 * The top section of a word detail view.
 *
 * Renders: word text · transcription · source attribution · save/remove action.
 *
 * - When learningState is null: shows "Save word" button
 * - When learningState is non-null + onEdit: shows "Saved ✓" badge that opens edit mode
 * - When learningState is non-null, no onEdit: shows "Saved ✓" badge that removes
 */
export function DictionaryHeader({
  word,
  learningState,
  onSave,
  onRemove,
  isMutating = false,
  context = 'search',
  onClose,
  onEdit,
  onViewInVocabulary,
}: Props) {
  const isSaved = learningState !== null
  const [hoveringBadge, setHoveringBadge] = useState(false)

  return (
    <header className={styles.header}>
      <div className={styles.wordBlock}>
        <Text variant="heading" as="h2" className={styles.word}>
          {word.text}
        </Text>
        <div className={styles.pronunciationRow}>
          {word.transcription && (
            <Text variant="caption" color="secondary" as="span" className={styles.transcription}>
              /{word.transcription}/
            </Text>
          )}
          <PronunciationButton wordId={word.id} word={word.text} />
        </div>
      </div>

      {/* Action area — three cases:
          1. vocabulary + onClose: inline × button aligned with the word title
          2. search + saved: "Saved ✓" badge (+ optional "View in vocabulary" link)
          3. search + unsaved: "Save word" button */}
      {context === 'vocabulary' ? (
        onClose ? (
          <button
            className={[styles.panelCloseBtn, 'icon-action'].join(' ')}
            onClick={onClose}
            aria-label="Close word detail"
          >
            <Icon icon={X} size={15} />
          </button>
        ) : null
      ) : (
        isSaved ? (
          <div className={styles.savedActions}>
            <button
              className={styles.savedBadge}
              onClick={onEdit ?? onRemove}
              onMouseEnter={() => setHoveringBadge(true)}
              onMouseLeave={() => setHoveringBadge(false)}
              disabled={isMutating}
              aria-label={onEdit ? `Edit saved meanings for ${word.text}` : `Remove ${word.text} from vocabulary`}
            >
              {hoveringBadge && onEdit ? 'Edit ✓' : 'Saved ✓'}
            </button>
            {onViewInVocabulary && (
              <button
                type="button"
                className={styles.viewInVocab}
                onClick={onViewInVocabulary}
              >
                View in vocabulary →
              </button>
            )}
          </div>
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
