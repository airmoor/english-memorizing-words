import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog'
import { useWordDetail } from '../../../shared/ui/WordDetail/WordDetailContext'
import { getCardState } from '../model/cardState'
import styles from './VocabularyItemCompact.module.css'

interface Props {
  item: VocabularyWord
  onRemove: (wordId: string) => void
  sourceList: string[]
}


/**
 * A single-row compact vocabulary entry.
 * Shows: state dot · word · transcription · delete button.
 * Clicking the row opens the word detail panel.
 */
export function VocabularyItemCompact({ item, onRemove, sourceList }: Props) {
  const { open, close, activeWordId } = useWordDetail()
  const isActive = activeWordId === item.wordId
  const [confirmOpen, setConfirmOpen] = useState(false)

  const state = getCardState(item)

  // Clicking an already-open card toggles it closed; otherwise opens it
  const handleOpen = () => {
    if (isActive) {
      close()
    } else {
      open(item.wordId, sourceList)
    }
  }

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmOpen(true)
  }

  return (
    <>
      <li
        className={[styles.row, isActive ? styles.rowActive : ''].join(' ')}
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen() }
        }}
        aria-label={isActive ? `Close detail for ${item.wordText}` : `Open detail for ${item.wordText}`}
        aria-pressed={isActive}
      >
        {/* State dot */}
        <span
          className={[styles.dot, styles[`dot_${state}`]].join(' ')}
          aria-label={state}
          title={state.charAt(0).toUpperCase() + state.slice(1)}
        />

        <div className={styles.wordBlock}>
          {/* Word */}
          <span className={styles.word}>{item.wordText}</span>

          {/* Transcription */}
          {item.transcription ? (
            <span className={styles.transcription}>/{item.transcription}/</span>
          ) : (
            <span />
          )}
        </div>

        {/* Delete */}
        <button
          className={[styles.deleteBtn, 'icon-action'].join(' ')}
          onClick={handleRemoveClick}
          aria-label={`Delete ${item.wordText}`}
          title="Delete word"
        >
          <Icon icon={Trash2} size={14} muted />
        </button>
      </li>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Delete "${item.wordText}"?`}
        body="This word will be removed from your vocabulary. Any review progress will be lost."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={() => { setConfirmOpen(false); onRemove(item.wordId) }}
        onCancel={() => setConfirmOpen(false)}
        danger
      />
    </>
  )
}
