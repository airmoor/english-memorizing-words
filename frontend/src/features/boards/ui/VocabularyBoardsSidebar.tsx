import { Inbox, Plus, Archive, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { useBoardsQuery } from '../model/useBoardsQuery'
import { useDeleteBoardMutation } from '../model/useUpdateBoardMutation'
import { CreateBoardSheet } from './CreateBoardSheet'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog'
import styles from './VocabularyBoardsSidebar.module.css'

interface VocabularyBoardsSidebarProps {
  /** Currently active board ID — undefined means "All Vocabulary" */
  activeBoardId?: string
  /** Called with the selected board ID, or undefined to show all. */
  onSelect: (boardId: string | undefined) => void
}

/**
 * Desktop-only navigation sidebar for vocabulary boards.
 *
 * Renders a calm, Linear-style nav column:
 *   All Vocabulary
 *   ──────────────
 *   BOARDS
 *   · Business English   128
 *   · Movies              47
 *   ──────────────
 *   + New board
 *
 * Sticky-positioned so it stays visible as the word list scrolls.
 * Hidden on mobile/tablet (display: none below 1024px).
 */
export function VocabularyBoardsSidebar({
  activeBoardId,
  onSelect,
}: VocabularyBoardsSidebarProps) {
  const [createOpen, setCreateOpen]           = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const { data: boards = [] }                 = useBoardsQuery()
  const deleteMutation                        = useDeleteBoardMutation()

  const activeBoards  = boards.filter((b) => !b.isArchived)
  const archivedCount = boards.filter((b) => b.isArchived).length
  const boardToDelete = activeBoards.find((b) => b.id === deleteConfirmId)

  const handleCreated = (boardId: string) => {
    // Auto-select the newly created board
    onSelect(boardId)
  }

  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return
    // If we're currently viewing this board, navigate back to all vocabulary
    if (deleteConfirmId === activeBoardId) {
      onSelect(undefined)
    }
    deleteMutation.mutate(deleteConfirmId)
    setDeleteConfirmId(null)
  }

  return (
    <>
      <nav className={styles.sidebar} aria-label="Boards">

        {/* ── All Vocabulary ──────────────────────────────────────────── */}
        <button
          type="button"
          className={[styles.item, !activeBoardId ? styles.itemActive : ''].join(' ')}
          onClick={() => onSelect(undefined)}
          aria-current={!activeBoardId ? 'page' : undefined}
        >
          <Icon icon={Inbox} size={15} />
          <span className={styles.itemLabel}>All Vocabulary</span>
        </button>

        {/* ── Board list ──────────────────────────────────────────────── */}
        {activeBoards.length > 0 && (
          <>
            <div className={styles.divider} aria-hidden="true" />
            <span className={styles.groupLabel} aria-hidden="true">Boards</span>

            {activeBoards.map((board) => {
              const isActive = activeBoardId === board.id
              return (
                <div key={board.id} className={styles.boardSlot}>
                  {/* Nav button — label only; trailing slot handles count/delete */}
                  <button
                    type="button"
                    className={[styles.item, isActive ? styles.itemActive : ''].join(' ')}
                    onClick={() => onSelect(board.id)}
                    aria-current={isActive ? 'page' : undefined}
                    title={board.name}
                  >
                    <span className={styles.itemLabel}>{board.name}</span>
                  </button>

                  {/* Trailing slot — count and delete share the same position and cross-fade */}
                  <div className={styles.itemTrailing} aria-hidden="true">
                    {board.cardCount > 0 && (
                      <span className={styles.trailingCount}>{board.cardCount}</span>
                    )}
                    <button
                      type="button"
                      className={styles.itemDeleteBtn}
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(board.id) }}
                      aria-label={`Delete ${board.name}`}
                      title="Delete board"
                      tabIndex={0}
                    >
                      <Icon icon={Trash2} size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* ── Footer actions ───────────────────────────────────────────── */}
        <div className={styles.divider} aria-hidden="true" />

        <button
          type="button"
          className={[styles.item, styles.itemAction].join(' ')}
          onClick={() => setCreateOpen(true)}
        >
          <Icon icon={Plus} size={14} />
          <span className={styles.itemLabel}>New board</span>
        </button>

        {archivedCount > 0 && (
          <button
            type="button"
            className={[styles.item, styles.itemMuted].join(' ')}
            disabled
            aria-label={`${archivedCount} archived board${archivedCount !== 1 ? 's' : ''}`}
          >
            <Icon icon={Archive} size={14} />
            <span className={styles.itemLabel}>
              Archived
              <span className={styles.itemCount}>{archivedCount}</span>
            </span>
          </button>
        )}

      </nav>

      <CreateBoardSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title={`Delete "${boardToDelete?.name ?? ''}"?`}
        body="Words in this board will remain in your vocabulary."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
        danger
      />
    </>
  )
}

