import type { ReviewState } from '../../../entities/vocabulary/model/types'
import styles from './ReviewInfoSection.module.css'

interface ReviewInfoSectionProps {
  reviewState: ReviewState
  nextReviewHuman: string | null
  lastReviewedAt: string | null
  savedAt: string
  intervalDays: number | null
}

const STATE_LABEL: Record<ReviewState, string> = {
  new:      'New',
  due:      'Due for review',
  upcoming: 'Upcoming',
  mastered: 'Mastered',
}

/**
 * Review info section in card detail.
 * Shows interval, next review timing, last reviewed, and date saved.
 * Read-only — just informational context for the learner.
 */
export function ReviewInfoSection({
  reviewState,
  nextReviewHuman,
  lastReviewedAt,
  savedAt,
  intervalDays,
}: ReviewInfoSectionProps) {
  const savedDate = new Date(savedAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
  const lastReviewedDate = lastReviewedAt
    ? new Date(lastReviewedAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null

  return (
    <section className={styles.section} aria-label="Review info">
      <div className={styles.header}>
        <span className={styles.title}>Review</span>
        <span className={[styles.stateBadge, styles[`state_${reviewState}`]].join(' ')}>
          {STATE_LABEL[reviewState]}
        </span>
      </div>

      <dl className={styles.list}>
        {nextReviewHuman && (
          <div className={styles.row}>
            <dt className={styles.key}>Next review</dt>
            <dd className={styles.value}>{nextReviewHuman}</dd>
          </div>
        )}
        {intervalDays !== null && intervalDays > 0 && (
          <div className={styles.row}>
            <dt className={styles.key}>Interval</dt>
            <dd className={styles.value}>{intervalDays} day{intervalDays !== 1 ? 's' : ''}</dd>
          </div>
        )}
        {lastReviewedDate && (
          <div className={styles.row}>
            <dt className={styles.key}>Last reviewed</dt>
            <dd className={styles.value}>{lastReviewedDate}</dd>
          </div>
        )}
        <div className={styles.row}>
          <dt className={styles.key}>Saved</dt>
          <dd className={styles.value}>{savedDate}</dd>
        </div>
      </dl>
    </section>
  )
}
