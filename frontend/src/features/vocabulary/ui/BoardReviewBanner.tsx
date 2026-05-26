import { Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { useBoardsQuery } from '../../boards/model/useBoardsQuery'
import styles from './BoardReviewBanner.module.css'

interface BoardReviewBannerProps {
  boardId: string
}

/**
 * Shown on the vocabulary page when a board filter is active.
 * Lets users jump directly into a board-scoped review session.
 *
 * UX design decisions:
 * - Compact banner below the filter bar — unobtrusive, doesn't consume card space
 * - Shows board name so scope is explicit before the user taps
 * - Always rendered when a board is active (per Q23 resolution)
 */
export function BoardReviewBanner({ boardId }: BoardReviewBannerProps) {
  const navigate = useNavigate()
  const { data: boards = [] } = useBoardsQuery()

  const board = boards.find((b) => b.id === boardId)
  const boardName = board?.name ?? 'this board'

  const handleStart = () => {
    const params = new URLSearchParams({ boardId })
    if (board?.name) params.set('boardName', board.name)
    navigate(`/review?${params.toString()}`)
  }

  return (
    <div className={styles.banner} role="region" aria-label={`Review ${boardName}`}>
      <span className={styles.label}>
        Reviewing <span className={styles.boardName}>{boardName}</span>
      </span>
      <button
        type="button"
        className={styles.cta}
        onClick={handleStart}
      >
        <Icon icon={Play} size={13} />
        Start review
      </button>
    </div>
  )
}

