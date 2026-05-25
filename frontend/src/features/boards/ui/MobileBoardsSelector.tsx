import { useState } from 'react'
import { BottomSheet } from '../../../shared/ui/BottomSheet/BottomSheet'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
import { useBoardsQuery } from '../model/useBoardsQuery'
import { CreateBoardSheet } from './CreateBoardSheet'
import styles from './MobileBoardsSelector.module.css'

interface MobileBoardsSelectorProps {
  /** Currently active board ID — undefined = All Vocabulary */
  activeBoardId?: string
  onSelect: (boardId: string | undefined) => void
}

/**
 * Mobile/tablet board context selector.
 *
 * Renders as a compact selector button:
 *   [ ≡  All Words  ▾ ]   or   [ ●  Business English  ✕ ]
 *
 * Tapping opens a BottomSheet with the full board list.
 * Visible only below 1024px — desktop uses VocabularyBoardsSidebar.
 */
export function MobileBoardsSelector({
  activeBoardId,
  onSelect,
}: MobileBoardsSelectorProps) {
  const [sheetOpen, setSheetOpen]   = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const { data: boards = [] }       = useBoardsQuery()

  const activeBoards = boards.filter((b) => !b.isArchived)
  const activeBoard  = boards.find((b) => b.id === activeBoardId)

  const handleSelect = (boardId: string | undefined) => {
    onSelect(boardId)
    setSheetOpen(false)
  }

  const handleCreated = (boardId: string) => {
    onSelect(boardId)
  }

  return (
    <>
      <div className={styles.selectorRow}>
        {/* Main selector button */}
        <button
          type="button"
          className={[
            styles.selector,
            activeBoardId ? styles.selectorScoped : '',
          ].join(' ')}
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-label={activeBoard ? `Viewing ${activeBoard.name}. Tap to change` : 'All Vocabulary. Tap to filter by board'}
        >
          {activeBoardId ? <BoardDotIcon /> : <InboxIcon />}
          <span className={styles.selectorLabel}>
            {activeBoard?.name ?? 'All Words'}
          </span>
          <ChevronIcon />
        </button>

        {/* Inline clear button — only visible when a board is selected */}
        {activeBoardId && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => onSelect(undefined)}
            aria-label="Back to all vocabulary"
          >
            <XIcon />
          </button>
        )}
      </div>

      {/* ── Board selection sheet ──────────────────────────────────────── */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        label="Select board"
      >
        <BottomSheetContent>
          <div className={styles.sheetHeader}>
            <span className={styles.sheetTitle}>Boards</span>
          </div>

          <ul className={styles.boardList} role="listbox" aria-label="Select board">

            {/* All Vocabulary option */}
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!activeBoardId}
                className={[
                  styles.boardRow,
                  !activeBoardId ? styles.boardRowActive : '',
                ].join(' ')}
                onClick={() => handleSelect(undefined)}
              >
                <InboxIcon />
                <span className={styles.boardRowLabel}>All Vocabulary</span>
                {!activeBoardId && <CheckIcon />}
              </button>
            </li>

            {/* Active boards */}
            {activeBoards.map((board) => {
              const isActive = activeBoardId === board.id
              return (
                <li key={board.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={[
                      styles.boardRow,
                      isActive ? styles.boardRowActive : '',
                    ].join(' ')}
                    onClick={() => handleSelect(board.id)}
                  >
                    <BoardDotIcon active={isActive} />
                    <span className={styles.boardRowLabel}>{board.name}</span>
                    {board.cardCount > 0 && (
                      <span className={styles.boardRowCount}>{board.cardCount}</span>
                    )}
                    {isActive && <CheckIcon />}
                  </button>
                </li>
              )
            })}

          </ul>

          {/* Create new board */}
          <button
            type="button"
            className={styles.createRow}
            onClick={() => { setSheetOpen(false); setCreateOpen(true) }}
          >
            <PlusIcon />
            <span>New board</span>
          </button>
        </BottomSheetContent>
      </BottomSheet>

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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

function BoardDotIcon({ active }: { active?: boolean }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
      <circle cx="4" cy="4" r="3.5" fill={active ? 'var(--color-accent)' : 'var(--color-text-secondary)'} opacity={active ? 1 : 0.4} />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, color: 'var(--color-accent)' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
