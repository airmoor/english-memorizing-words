import { useState } from 'react'
import { useBoardsQuery } from '../model/useBoardsQuery'
import { CreateBoardSheet } from './CreateBoardSheet'
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
  const [createOpen, setCreateOpen] = useState(false)
  const { data: boards = [] } = useBoardsQuery()

  const activeBoards   = boards.filter((b) => !b.isArchived)
  const archivedCount  = boards.filter((b) => b.isArchived).length

  const handleCreated = (boardId: string) => {
    // Auto-select the newly created board
    onSelect(boardId)
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
          <InboxIcon />
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
                <button
                  key={board.id}
                  type="button"
                  className={[styles.item, isActive ? styles.itemActive : ''].join(' ')}
                  onClick={() => onSelect(board.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={board.name}
                >
                  <span className={styles.itemLabel}>{board.name}</span>
                  {board.cardCount > 0 && (
                    <span className={styles.itemCount} aria-label={`${board.cardCount} words`}>
                      {board.cardCount}
                    </span>
                  )}
                </button>
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
          <PlusIcon />
          <span className={styles.itemLabel}>New board</span>
        </button>

        {archivedCount > 0 && (
          <button
            type="button"
            className={[styles.item, styles.itemMuted].join(' ')}
            disabled
            aria-label={`${archivedCount} archived board${archivedCount !== 1 ? 's' : ''}`}
          >
            <ArchiveIcon />
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
    </>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function InboxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.icon}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.icon}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function ArchiveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.icon}>
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}
