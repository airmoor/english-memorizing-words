import { useQuery } from '@tanstack/react-query'
import { LayoutGrid } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
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
 * Shows: how many cards are left to review right now (matches the Home page's
 * "X cards due today" — both surfaces read the same live `dueToday` count so
 * they never disagree) + streak badge.
 * When boardId is provided, all counts are board-scoped so the label
 * accurately reflects the board's queue, not the global one.
 */
export function SessionProgress({ boardId, boardName }: SessionProgressProps) {
  const { data } = useQuery({
    // Include boardId in the key so board-scoped and global results don't collide.
    queryKey: ['progress', { boardId }],
    queryFn: () => getProgress(boardId),
    refetchInterval: 30_000,
  })

  if (!data) return <div className={styles.bar} aria-hidden />

  const hasEverHadCards = data.dueToday > 0 || data.reviewedToday > 0
  const isDone = hasEverHadCards && data.dueToday === 0
  // No fixed "total due today" exists — dueToday is a live remaining count,
  // not a fraction of an original total — so the track is a done/not-done
  // indicator rather than a fabricated percentage.
  const percent = isDone ? 100 : 0

  // Board-scoped sessions get explicit contextual labels so users know
  // they are reviewing one board's queue, not the global queue.
  const statusText = (() => {
    if (!hasEverHadCards) {
      return boardName ? `No cards due in ${boardName}` : 'No cards due today'
    }
    if (isDone) {
      return boardName ? `${boardName} — all done ✓` : 'Session complete ✓'
    }
    const left = `${data.dueToday} card${data.dueToday !== 1 ? 's' : ''} left`
    if (boardName) {
      return `${left} · ${boardName}`
    }
    return data.reviewedToday > 0 ? `${left} · ${data.reviewedToday} reviewed today` : left
  })()

  return (
    <div className={styles.bar}>
      {/* Board scope chip — visible only during board-filtered sessions */}
      {boardName && (
        <div className={styles.scopeRow}>
          <span className={styles.scopeChip}>
            <Icon icon={LayoutGrid} size={11} />
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

