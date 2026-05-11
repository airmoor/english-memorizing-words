import { useState } from 'react'
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

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

/**
 * A single-row compact vocabulary entry.
 * Shows: state dot · word · transcription · delete button.
 * Clicking the row opens the word detail panel.
 */
export function VocabularyItemCompact({ item, onRemove, sourceList }: Props) {
  const { open, activeWordId } = useWordDetail()
  const isActive = activeWordId === item.wordId
  const [confirmOpen, setConfirmOpen] = useState(false)

  const state = getCardState(item)

  const handleOpen = () => open(item.wordId, sourceList)

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
        aria-label={`Open detail for ${item.wordText}`}
        aria-pressed={isActive}
      >
        {/* State dot */}
        <span
          className={[styles.dot, styles[`dot_${state}`]].join(' ')}
          aria-label={state}
          title={state.charAt(0).toUpperCase() + state.slice(1)}
        />

        {/* Word */}
        <span className={styles.word}>{item.wordText}</span>

        {/* Transcription */}
        {item.transcription ? (
          <span className={styles.transcription}>/{item.transcription}/</span>
        ) : (
          <span />
        )}

        {/* Delete */}
        <button
          className={styles.deleteBtn}
          onClick={handleRemoveClick}
          aria-label={`Delete ${item.wordText}`}
          title="Delete word"
        >
          <TrashIcon />
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
