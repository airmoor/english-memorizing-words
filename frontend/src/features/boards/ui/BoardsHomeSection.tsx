import { useNavigate } from 'react-router-dom'
import { useBoardsQuery } from '../model/useBoardsQuery'
import styles from './BoardsHomeSection.module.css'

const MAX_BOARDS = 4

/**
 * Lightweight "Your boards" widget for the Home page.
 *
 * Shows up to 4 active boards with word counts.
 * Tapping a board navigates to /vocabulary with that board pre-selected.
 * Hidden when the user has no boards.
 *
 * Visual intent: quiet, scannable — quick re-entry into active collections.
 * Does not render any container/card — the parent Home layout owns the card.
 */
export function BoardsHomeSection() {
  const navigate         = useNavigate()
  const { data: boards = [], isLoading } = useBoardsQuery()

  const activeBoards = boards
    .filter((b) => !b.isArchived)
    .slice(0, MAX_BOARDS)

  // Don't render at all if no boards exist
  if (!isLoading && activeBoards.length === 0) return null

  const handleBoard = (boardId: string) => {
    // Navigate to vocabulary with board pre-selected via URL search param
    navigate(`/vocabulary?board=${encodeURIComponent(boardId)}`)
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <span className={styles.label}>Your boards</span>
        <button
          type="button"
          className={styles.manageLink}
          onClick={() => navigate('/vocabulary')}
        >
          View all →
        </button>
      </div>

      {isLoading ? (
        <div className={styles.skeleton}>
          {[88, 112, 72, 96].map((w, i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={styles.skeletonDot} />
              <div className={styles.skeletonName} style={{ width: w }} />
              <div className={styles.skeletonCount} />
            </div>
          ))}
        </div>
      ) : (
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
