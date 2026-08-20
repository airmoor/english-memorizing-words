import { ArrowRight, LayoutGrid } from 'lucide-react'
import { useNavigate } from '../../../shared/lib/useAppNavigate'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { useBoardsQuery } from '../model/useBoardsQuery'
import styles from './BoardsHomeSection.module.css'

const MAX_BOARDS = 4

/**
 * Lightweight "Your boards" widget for the Home page.
 *
 * Shows up to 4 active boards with word counts.
 * - Loading: pulsing placeholder that matches the empty-state layout
 *   (icon + two lines of copy + CTA). Guessing a 4-row board list made
 *   the card shrink — and during the crossfade both layers were visible
 *   at once, so the count pills sat beside the empty copy.
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
        <div className={styles.emptyState} aria-hidden="true">
          <span className={styles.skeletonIcon} />
          <p className={styles.emptyText}>
            <span className={styles.skeletonText}>
              Group your vocabulary into boards for focused review.
            </span>
          </p>
          <span className={styles.emptyBtn}>
            <span className={styles.skeletonText}>Create your first board →</span>
          </span>
        </div>
      ) : activeBoards.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}><Icon icon={LayoutGrid} size={28} muted /></span>
          <p className={styles.emptyText}>
            Group your vocabulary into boards for focused review.
          </p>
          <button
            type="button"
            className={styles.emptyBtn}
            onClick={() => navigate('/vocabulary?createBoard=1')}
          >
            Create your first board →
          </button>
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
                <Icon icon={ArrowRight} size={13} className={styles.arrow} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

