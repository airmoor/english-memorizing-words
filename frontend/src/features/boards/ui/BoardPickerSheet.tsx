import { AdaptiveSheet } from '../../../shared/ui/AdaptiveSheet/AdaptiveSheet'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
import type { BoardSummary } from '../../../entities/board/model/types'
import { useBoardsQuery } from '../model/useBoardsQuery'
import { useAssignCardToBoard, useRemoveCardFromBoard } from '../model/useCardBoardMutation'
import styles from './BoardPickerSheet.module.css'

interface BoardPickerSheetProps {
  open: boolean
  onClose: () => void
  cardId: string
  assignedBoards: BoardSummary[]
  onCreateNew?: () => void
}

/**
 * Sheet / modal for picking which boards a card belongs to.
 * Shows all the user's boards; checked boards are those the card is already on.
 */
export function BoardPickerSheet({
  open,
  onClose,
  cardId,
  assignedBoards,
  onCreateNew,
}: BoardPickerSheetProps) {
  const { data: boards = [] } = useBoardsQuery()
  const assignMutation        = useAssignCardToBoard()
  const removeMutation        = useRemoveCardFromBoard()

  const assignedIds = new Set(assignedBoards.map((b) => b.id))

  const toggle = (boardId: string) => {
    if (assignedIds.has(boardId)) {
      removeMutation.mutate({ boardId, cardId })
    } else {
      assignMutation.mutate({ boardId, cardId })
    }
  }

  const activeBoards   = boards.filter((b) => !b.isArchived)
  const archivedBoards = boards.filter((b) => b.isArchived)

  return (
    <AdaptiveSheet open={open} onClose={onClose} label="Add to board">
      <BottomSheetContent>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <h2 className={styles.title}>Add to board</h2>
          <div className={styles.headerActions}>
            {onCreateNew && (
              <button
                type="button"
                className={styles.newBoardLink}
                onClick={onCreateNew}
              >
                <PlusIcon />
                New board
              </button>
            )}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* ── Board list ─────────────────────────────────────────────── */}
        {activeBoards.length === 0 ? (
          <p className={styles.empty}>No boards yet.</p>
        ) : (
          <ul className={styles.list} role="list">
            {activeBoards.map((board) => {
              const checked = assignedIds.has(board.id)
              return (
                <li key={board.id}>
                  <button
                    type="button"
                    className={[styles.row, checked ? styles.rowChecked : ''].join(' ')}
                    onClick={() => toggle(board.id)}
                    aria-pressed={checked}
                  >
                    <span className={styles.rowName}>{board.name}</span>
                    <span className={styles.rowCount} aria-hidden="true">
                      {board.cardCount}
                    </span>
                    <span className={[styles.checkbox, checked ? styles.checkboxChecked : ''].join(' ')} aria-hidden="true">
                      {checked && <CheckIcon />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {archivedBoards.length > 0 && (
          <details className={styles.archivedSection}>
            <summary className={styles.archivedToggle}>
              Archived ({archivedBoards.length})
            </summary>
            <ul className={styles.list} role="list">
              {archivedBoards.map((board) => {
                const checked = assignedIds.has(board.id)
                return (
                  <li key={board.id}>
                    <button
                      type="button"
                      className={[styles.row, styles.rowArchived, checked ? styles.rowChecked : ''].join(' ')}
                      onClick={() => toggle(board.id)}
                      aria-pressed={checked}
                    >
                      <span className={styles.rowName}>{board.name}</span>
                      <span className={[styles.checkbox, checked ? styles.checkboxChecked : ''].join(' ')} aria-hidden="true">
                        {checked && <CheckIcon />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </details>
        )}
      </BottomSheetContent>
    </AdaptiveSheet>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  )
}
