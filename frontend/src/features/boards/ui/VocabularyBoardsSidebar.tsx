import { Inbox, Plus, Archive, Trash2, Share2, Link2, Check } from 'lucide-react'
import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { useBoardsQuery } from '../model/useBoardsQuery'
import { useDeleteBoardMutation } from '../model/useUpdateBoardMutation'
import { CreateBoardSheet } from './CreateBoardSheet'
import { ShareBoardSheet } from './ShareBoardSheet'
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog/ConfirmDialog'
import { featureFlags } from '../../../shared/lib/featureFlags'
import { useIsPointerDesktop } from '../../../shared/lib/useIsPointerDesktop'
import type { Board } from '../../../entities/board/model/types'
import styles from './VocabularyBoardsSidebar.module.css'

interface VocabularyBoardsSidebarProps {
  /** Currently active board ID — undefined means "All Vocabulary" */
  activeBoardId?: string
  /** Called with the selected board ID, or undefined to show all. */
  onSelect: (boardId: string | undefined) => void
  /** Board that just received a card via drag — flashes a local success cue. */
  recentlyAddedBoardId?: string | null
}

interface BoardSidebarRowProps {
  board: Board
  isActive: boolean
  onSelect: (boardId: string) => void
  onShare: (boardId: string) => void
  onDelete: (boardId: string) => void
  justAdded: boolean
}

/**
 * One board row in the sidebar nav — also a drag-and-drop target. Dragging a
 * vocabulary row here (desktop pointer only, see useIsPointerDesktop) adds
 * that card to the board. useDroppable is safe to call unconditionally: it's
 * a no-op until something is actually draggable.
 */
function BoardSidebarRow({ board, isActive, onSelect, onShare, onDelete, justAdded }: BoardSidebarRowProps) {
  const isPointerDesktop = useIsPointerDesktop()
  const { setNodeRef, isOver } = useDroppable({
    id: `board-${board.id}`,
    data: { boardId: board.id, boardName: board.name },
    disabled: !featureFlags.boardsTags || !isPointerDesktop,
  })

  return (
    <div
      ref={setNodeRef}
      className={[
        styles.boardSlot,
        isOver ? styles.boardSlotOver : '',
        justAdded ? styles.boardSlotSuccess : '',
      ].join(' ')}
    >
      {/* Nav button — label only; trailing slot handles count/delete */}
      <button
        type="button"
        className={[styles.item, isActive ? styles.itemActive : ''].join(' ')}
        onClick={() => onSelect(board.id)}
        aria-current={isActive ? 'page' : undefined}
        title={board.name}
      >
        <span className={styles.itemLabel}>{board.name}</span>
        {board.visibility === 'unlisted' && (
          <span
            role="img"
            aria-label="Shared — anyone with the link can view"
            className={styles.sharedIndicator}
          >
            <Icon icon={Link2} size={11} />
          </span>
        )}
      </button>

      {/* Trailing slot — count fades out on hover, actions fade in.
          On a successful drag-drop, briefly replaces count/actions with a
          checkmark — the drop happens right here, so the confirmation
          should too, rather than relying solely on the global toast. */}
      <div className={styles.itemTrailing} aria-hidden="true">
        {justAdded ? (
          <span className={styles.trailingCheck}>
            <Icon icon={Check} size={14} />
          </span>
        ) : (
          board.cardCount > 0 && (
            <span className={styles.trailingCount}>{board.cardCount}</span>
          )
        )}
        <div className={styles.itemActions}>
          <button
            type="button"
            className={styles.itemShareBtn}
            onClick={(e) => { e.stopPropagation(); onShare(board.id) }}
            aria-label={`Share ${board.name}`}
            title="Share board"
            tabIndex={0}
          >
            <Icon icon={Share2} size={13} />
          </button>
          <button
            type="button"
            className={styles.itemDeleteBtn}
            onClick={(e) => { e.stopPropagation(); onDelete(board.id) }}
            aria-label={`Delete ${board.name}`}
            title="Delete board"
            tabIndex={0}
          >
            <Icon icon={Trash2} size={13} />
          </button>
        </div>
      </div>
    </div>
  )
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
  recentlyAddedBoardId,
}: VocabularyBoardsSidebarProps) {
  const [createOpen, setCreateOpen]           = useState(false)
  const [shareBoardId, setShareBoardId]       = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const { data: boards = [] }                 = useBoardsQuery()
  const deleteMutation                        = useDeleteBoardMutation()

  const activeBoards  = boards.filter((b) => !b.isArchived)
  const archivedCount = boards.filter((b) => b.isArchived).length
  const boardToDelete = activeBoards.find((b) => b.id === deleteConfirmId)
  const boardToShare   = activeBoards.find((b) => b.id === shareBoardId)

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

            {activeBoards.map((board) => (
              <BoardSidebarRow
                key={board.id}
                board={board}
                isActive={activeBoardId === board.id}
                onSelect={onSelect}
                onShare={setShareBoardId}
                onDelete={setDeleteConfirmId}
                justAdded={recentlyAddedBoardId === board.id}
              />
            ))}
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

      <ShareBoardSheet
        open={shareBoardId !== null}
        onClose={() => setShareBoardId(null)}
        board={boardToShare}
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

