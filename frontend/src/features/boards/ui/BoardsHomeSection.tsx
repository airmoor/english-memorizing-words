import { useNavigate } from 'react-router-dom'
import { useBoardsQuery } from '../model/useBoardsQuery'
import styles from './BoardsHomeSection.module.css'

const MAX_BOARDS = 4

/**
 * Lightweight "Your boards" widget for the Home page.
 *
 * Shows up to 4 active boards with word counts.
 * - Loading: pulsing skeleton rows.
 * - Empty: quiet CTA to create the first board.
 * - Loaded: scannable board list with word counts.
 *
 * Tapping a board navigates to /vocabulary with that board pre-selected.
 * Does not render any container/card — the parent Home layout owns the card.
 */
export function BoardsHomeSection() {
  const navigate = useNavigate()
  const { data: boards = [], isLoading } = useBoardsQuery()

  const activeBoards = boards
    .filter((b) => !b.isArchived)
    .slice(0, MAX_BOARDS)

  const handleBoard = (boardId: string) => {
    navigate(`/vocabulary?board=${encodeURIComponent(boardId)}`)
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <span className={styles.label}>Your boards</span>
        {!isLoading && activeBoards.length > 0 && (
          <button
            type="button"
            className={styles.manageLink}
            onClick={() => navigate('/vocabulary')}
          >
            View all →
          </button>
        )}
      </div>

      {isLoading ? (
        /* ── Loading skeleton ─────────────────────────────────────────── */
        <div className={styles.skeleton}>
          {[88, 112, 72, 96].map((w, i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={styles.skeletonDot} />
              <div className={styles.skeletonName} style={{ width: w }} />
              <div className={styles.skeletonCount} />
            </div>
          ))}
        </div>
      ) : activeBoards.length === 0 ? (
        /* ── Empty state ──────────────────────────────────────────────── */
        <div className={styles.emptyState}>
          <BoardsEmptyIcon />
          <p className={styles.emptyText}>
            Group your vocabulary into boards for focused review.
          </p>
          <button
            type="button"
            className={styles.emptyBtn}
            onClick={() => navigate('/vocabulary')}
          >
            Create your first board →
          </button>
        </div>
      ) : (
        /* ── Board list ───────────────────────────────────────────────── */
        <ul className={styles.list}>
          {activeBoards.map((board) => (
            <li key={board.id}>
              <button
                type="button"
                className={styles.boardRow}
                onClick={() => handleBoard(board.id)}
              >
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.boardName}>{board.name}</span>
                <span className={styles.boardCount}>
                  {board.cardCount > 0
                    ? `${board.cardCount} word${board.cardCount !== 1 ? 's' : ''}`
                    : 'Empty'}
                </span>
                <ArrowIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.arrow}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

/** Subtle two-column grid icon — communicates "boards" without heavy decoration. */
function BoardsEmptyIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.emptyIcon}
    >
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}
