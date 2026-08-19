import { Check, Plus, X } from 'lucide-react'
import { AdaptiveSheet } from '../../../shared/ui/AdaptiveSheet/AdaptiveSheet'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
import { Icon } from '../../../shared/ui/Icon/Icon'
import type { BoardSummary } from '../../../entities/board/model/types'
import { useBoardsQuery } from '../model/useBoardsQuery'
import { useAssignCardToBoard, useRemoveCardFromBoard } from '../model/useCardBoardMutation'
import styles from './BoardPickerSheet.module.css'

interface BoardPickerSheetProps {
  open: boolean
  onClose: () => void
  cardId: string
  wordId: string
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
  wordId,
  assignedBoards,
  onCreateNew,
}: BoardPickerSheetProps) {
  const { data: boards = [] } = useBoardsQuery()
  const assignMutation        = useAssignCardToBoard()
  const removeMutation        = useRemoveCardFromBoard()

  const assignedIds = new Set(assignedBoards.map((b) => b.id))

  const toggle = (boardId: string) => {
    if (assignedIds.has(boardId)) {
      removeMutation.mutate({ boardId, cardId, wordId })
    } else {
      assignMutation.mutate({ boardId, cardId, wordId })
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
                <Icon icon={Plus} size={14} />
                New board
              </button>
            )}
            <button
              type="button"
              className={[styles.closeBtn, 'icon-action'].join(' ')}
              onClick={onClose}
              aria-label="Close"
            >
              <Icon icon={X} size={18} />
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
                    <span className={[styles.checkbox, checked ? styles.checkboxChecked : ''].join(' ')} aria-hidden="true">
                      {checked && <Icon icon={Check} size={11} strokeWidth={2.5} />}
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
                        {checked && <Icon icon={Check} size={11} strokeWidth={2.5} />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </details>
        )}

        {/* ── Footer — explicit "Done" beats relying on the corner × ────── */}
        <div className={styles.footer}>
          <button type="button" className={styles.doneBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </BottomSheetContent>
    </AdaptiveSheet>
  )
}

