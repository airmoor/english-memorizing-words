import { useQuery } from '@tanstack/react-query'
import { getProgress } from '../api/getProgress'
import styles from './SessionProgress.module.css'

interface SessionProgressProps {
  /** When set, shows the board name in the progress label */
  boardId?: string
  boardName?: string
}

/**
 * In-session review progress experience.
 * Shows: today's progress bar (reviewed / due+reviewed) + streak badge.
 * When a board is active, surfaces the board name in the status text.
 */
export function SessionProgress({ boardName }: SessionProgressProps) {
  const { data } = useQuery({
    queryKey: ['progress'],
    queryFn: getProgress,
    refetchInterval: 30_000,
  })

  if (!data) return <div className={styles.bar} aria-hidden />

  const sessionTotal = data.dueToday + data.reviewedToday
  const percent = sessionTotal === 0 ? 0 : Math.round((data.reviewedToday / sessionTotal) * 100)
  const isDone = sessionTotal > 0 && data.dueToday === 0

  const scopeLabel = boardName ? ` · ${boardName}` : ''
  const statusText = sessionTotal === 0
    ? `No cards due${boardName ? ` in ${boardName}` : ' today'}`
    : isDone
      ? `Session complete ✓${scopeLabel}`
      : `${data.reviewedToday} of ${sessionTotal} reviewed${scopeLabel}`

  return (
    <div className={styles.bar}>
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
        aria-label="Today's review progress"
      >
        <div
          className={[styles.fill, isDone ? styles.fillDone : ''].join(' ')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
