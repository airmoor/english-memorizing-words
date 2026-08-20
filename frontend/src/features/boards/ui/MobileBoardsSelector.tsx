import { useState } from 'react'
import { Inbox, ChevronDown, X, Check, Plus, Share2, Link2 } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { BottomSheet } from '../../../shared/ui/BottomSheet/BottomSheet'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
import { useBoardsQuery } from '../model/useBoardsQuery'
import { CreateBoardSheet } from './CreateBoardSheet'
import { ShareBoardSheet } from './ShareBoardSheet'
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
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [createOpen, setCreateOpen]   = useState(false)
  const [shareBoardId, setShareBoardId] = useState<string | null>(null)
  const { data: boards = [] }         = useBoardsQuery()

  const activeBoards = boards.filter((b) => !b.isArchived)
  const activeBoard  = boards.find((b) => b.id === activeBoardId)
  const boardToShare = activeBoards.find((b) => b.id === shareBoardId)

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
          {activeBoardId ? <BoardDotIcon /> : <Icon icon={Inbox} size={14} />}
          <span className={styles.selectorLabel}>
            {activeBoard?.name ?? 'All Words'}
          </span>
          <Icon icon={ChevronDown} size={12} />
        </button>

        {/* Inline clear button — only visible when a board is selected */}
        {activeBoardId && (
          <button
            type="button"
            className={[styles.clearBtn, 'icon-action'].join(' ')}
            onClick={() => onSelect(undefined)}
            aria-label="Back to all vocabulary"
          >
            <Icon icon={X} size={12} />
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
                <Icon icon={Inbox} size={14} />
                <span className={styles.boardRowLabel}>All Vocabulary</span>
                {!activeBoardId && (
                  <Icon icon={Check} size={14} strokeWidth={2.5} style={{ flexShrink: 0, color: 'var(--color-accent)' }} />
                )}
              </button>
            </li>

            {/* Active boards */}
            {activeBoards.map((board) => {
              const isActive = activeBoardId === board.id
              return (
                <li key={board.id} className={styles.boardRowWrap}>
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
                    {board.visibility === 'unlisted' && (
                      <span
                        role="img"
                        aria-label="Shared — anyone with the link can view"
                        className={styles.sharedIndicator}
                      >
                        <Icon icon={Link2} size={12} />
                      </span>
                    )}
                    {board.cardCount > 0 && (
                      <span className={styles.boardRowCount}>{board.cardCount}</span>
                    )}
                    {isActive && (
                      <Icon icon={Check} size={14} strokeWidth={2.5} style={{ flexShrink: 0, color: 'var(--color-accent)' }} />
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.rowShareBtn}
                    onClick={() => setShareBoardId(board.id)}
                    aria-label={`Share ${board.name}`}
                  >
                    <Icon icon={Share2} size={15} />
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
            <Icon icon={Plus} size={14} />
            <span>New board</span>
          </button>
        </BottomSheetContent>
      </BottomSheet>

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
    </>
  )
}

// ── Board dot (semantic active/inactive indicator, not a standard icon) ────────

function BoardDotIcon({ active }: { active?: boolean }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
      <circle
        cx="4" cy="4" r="3.5"
        fill={active ? 'var(--color-accent)' : 'var(--color-text-secondary)'}
        opacity={active ? 1 : 0.4}
      />
    </svg>
  )
}
