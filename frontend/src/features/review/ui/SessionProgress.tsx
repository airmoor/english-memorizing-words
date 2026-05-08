import { useQuery } from '@tanstack/react-query'
import { getProgress } from '../api/getProgress'
import styles from './SessionProgress.module.css'

/**
 * In-session review progress experience.
 * Shows: today's progress bar (reviewed / due+reviewed) + streak badge.
 *
 * Replaces the older counter-style header — bulk stats now live on /home.
 */
export function SessionProgress() {
  const { data } = useQuery({
    queryKey: ['progress'],
    queryFn: getProgress,
    refetchInterval: 30_000,
  })

  if (!data) return <div className={styles.bar} aria-hidden />

  // Total cards in today's session = those still due + those already reviewed
  const sessionTotal = data.dueToday + data.reviewedToday
  const percent = sessionTotal === 0 ? 0 : Math.round((data.reviewedToday / sessionTotal) * 100)
  const isDone = sessionTotal > 0 && data.dueToday === 0

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
      <div className={styles.text}>
        <span className={styles.label}>
          {sessionTotal === 0
            ? 'No cards due today'
            : isDone
            ? 'Session complete'
            : `${data.reviewedToday} of ${sessionTotal} reviewed`}
        </span>
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
    </div>
  )
}
