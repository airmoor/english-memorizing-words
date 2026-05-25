import { useState } from 'react'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
import { Card } from '../../../shared/ui/Card/Card'
import { Text } from '../../../shared/ui/Typography/Typography'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog'
import { useWordDetail } from '../../../shared/ui/WordDetail/WordDetailContext'
import { getCardState } from '../model/cardState'
import { ReviewStateBadge } from './ReviewStateBadge'
import { featureFlags } from '../../../shared/lib/featureFlags'
import styles from './VocabularyItem.module.css'

interface Props {
  item: VocabularyWord
  onRemove: (wordId: string) => void
  /** All word IDs in the current list, in display order. Used for panel navigation. */
  sourceList: string[]
}

/** Trash bin icon (16×16 outline). */
function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

/**
 * A single vocabulary entry row.
 *
 * - Clicking anywhere on the card opens the word detail panel.
 * - The trash button opens a confirmation dialog before removing.
 * - Active state: accent dot shown while this word is open in the panel.
 */
export function VocabularyItem({ item, onRemove, sourceList }: Props) {
  const { open, activeWordId } = useWordDetail()
  const isActive = activeWordId === item.wordId
  const [confirmOpen, setConfirmOpen] = useState(false)
  const state = getCardState(item)

  const handleOpen = () => {
    open(item.wordId, sourceList)
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmOpen(true)
  }

  const handleConfirmRemove = () => {
    setConfirmOpen(false)
    onRemove(item.wordId)
  }

  const handleCancelRemove = () => {
    setConfirmOpen(false)
  }

  return (
    <>
      {/* Full card is clickable — onClick propagates from inner rowButton naturally.
          The card-level onClick catches clicks on padding/whitespace areas. */}
      <Card
        as="li"
        padding="sm"
        interactive
        className={[styles.item, styles[`state_${state}`]].join(' ')}
        onClick={handleOpen}
      >
        {/* Main row body — content + keyboard activation */}
        <div
          role="button"
          className={styles.rowButton}
          aria-label={`Open detail for ${item.wordText}`}
          aria-pressed={isActive}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen() } }}
        >
          <div className={styles.wordRow}>
            <Text variant="label" as="span" className={styles.word}>
              {item.wordText}
            </Text>
            {item.transcription && (
              <span className={styles.transcription}>/{item.transcription}/</span>
            )}
            <ReviewStateBadge reviewState={item.reviewState} nextReviewHuman={item.nextReviewHuman} />
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

          {/* Board / tag chips */}
          {featureFlags.boardsTags && (item.boards.length > 0 || item.tags.length > 0) && (
            <div className={styles.metaChips}>
              {item.boards.slice(0, 2).map((b) => (
                <span key={b.id} className={styles.boardChip}>{b.name}</span>
              ))}
              {item.tags.slice(0, 2).map((t) => (
                <span key={t.id} className={styles.tagChip}>{t.name}</span>
              ))}
              {(item.boards.length + item.tags.length) > 4 && (
                <span className={styles.moreChip}>
                  +{(item.boards.length + item.tags.length) - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Delete button — opens confirmation dialog, does not open the panel */}
        <button
          className={styles.removeBtn}
          onClick={handleRemoveClick}
          aria-label={`Delete ${item.wordText} from vocabulary`}
          title="Delete word"
        >
          <TrashIcon />
        </button>
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Delete "${item.wordText}"?`}
        body="This word will be removed from your vocabulary. Any review progress will be lost."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={handleConfirmRemove}
        onCancel={handleCancelRemove}
        danger
      />
    </>
  )
}
