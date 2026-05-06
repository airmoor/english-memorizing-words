import { useQuery } from '@tanstack/react-query'
import { getProgress } from '../api/getProgress'
import styles from './ProgressHeader.module.css'

export function ProgressHeader() {
  const { data } = useQuery({
    queryKey: ['progress'],
    queryFn: getProgress,
    refetchInterval: 30_000,
  })

  if (!data) return <div className={styles.bar} />

  return (
    <div className={styles.bar}>
      {data.streak > 0 && (
        <span className={styles.streak}>🔥 {data.streak} day streak</span>
      )}
      <span className={styles.stat}>
        <strong>{data.dueToday}</strong> due
      </span>
      <span className={styles.divider}>·</span>
      <span className={styles.stat}>
        <strong>{data.reviewedToday}</strong> done
      </span>
      <span className={styles.divider}>·</span>
      <span className={styles.stat}>
        <strong>{data.total}</strong> total
      </span>
    </div>
  )
}
