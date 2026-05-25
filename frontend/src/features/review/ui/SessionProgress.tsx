import { useQuery } from '@tanstack/react-query'
import { getProgress } from '../api/getProgress'
import styles from './SessionProgress.module.css'

interface SessionProgressProps {
  /**
   * When set, scopes the progress query to this board.
   * Due/reviewedToday/total will reflect the board's queue only.
   */
  boardId?: string
  /** Board name shown in the status text when scoped. */
  boardName?: string
}

/**
 * In-session review progress experience.
 * Shows: today's progress bar (reviewed / due+reviewed) + streak badge.
 * When boardId is provided, all counts are board-scoped so the bar and label
 * accurately reflect "N of M board cards reviewed", not the global queue.
 */
export function SessionProgress({ boardId, boardName }: SessionProgressProps) {
  const { data } = useQuery({
    // Include boardId in the key so board-scoped and global results don't collide.
    queryKey: ['progress', { boardId }],
    queryFn: () => getProgress(boardId),
    refetchInterval: 30_000,
  })

  if (!data) return <div className={styles.bar} aria-hidden />

  const sessionTotal = data.dueToday + data.reviewedToday
  const percent = sessionTotal === 0 ? 0 : Math.round((data.reviewedToday / sessionTotal) * 100)
  const isDone = sessionTotal > 0 && data.dueToday === 0

  // Board-scoped sessions get explicit contextual labels so users know
  // they are reviewing one board's queue, not the global queue.
  const statusText = (() => {
    if (sessionTotal === 0) {
      return boardName ? `No cards due in ${boardName}` : 'No cards due today'
    }
    if (isDone) {
      return boardName ? `${boardName} — all done ✓` : 'Session complete ✓'
    }
    if (boardName) {
      return `${data.reviewedToday} of ${sessionTotal} · ${boardName}`
    }
    return `${data.reviewedToday} of ${sessionTotal} reviewed`
  })()

  return (
    <div className={styles.bar}>
      {/* Board scope chip — visible only during board-filtered sessions */}
      {boardName && (
        <div className={styles.scopeRow}>
          <span className={styles.scopeChip}>
            <BoardIcon />
            {boardName}
          </span>
        </div>
      )}

      <div className={styles.text}>
        <span className={styles.label}>{statusText}</span>
        {data.streak > 0 && (
          <span className={styles.streak} title={`${data.streak} day streak`}>
            🔥 {data.streak}
          </span>
        )}
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={boardName ? `Review progress for ${boardName}` : "Today's review progress"}
      >
        <div
          className={[styles.fill, isDone ? styles.fillDone : ''].join(' ')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function BoardIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
