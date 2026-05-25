import { useNavigate } from 'react-router-dom'
import { Text } from '../../../shared/ui/Typography/Typography'
import type { Rating } from '../../../entities/review/model/types'
import styles from './SessionSummary.module.css'

export type RatingCounts = Record<Rating, number>

interface SessionSummaryProps {
  /** Total cards reviewed in this session */
  reviewedCount: number
  /** Per-rating breakdown */
  counts: RatingCounts
  /** Humanised "Next cards due in X" string, or null if nothing scheduled */
  nextReviewHuman: string | null
  /** Board name if this was a board-scoped session */
  boardName?: string
}

const RATING_CONFIG: { value: Rating; label: string; icon: string; cls: string }[] = [
  { value: 'again', label: 'Again', icon: '↩', cls: 'again' },
  { value: 'hard',  label: 'Hard',  icon: '~', cls: 'hard'  },
  { value: 'good',  label: 'Good',  icon: '✓', cls: 'good'  },
  { value: 'easy',  label: 'Easy',  icon: '✦', cls: 'easy'  },
]

/**
 * Shown after a review session completes (queue exhausted).
 *
 * UX decisions:
 * - Calm and affirming — no score or percentage, just a count + breakdown
 * - Rating breakdown uses subtle chips, not a full table, to stay minimal
 * - Board name surfaced when session was board-scoped
 * - "Next due" line only shown when there's a meaningful future review
 * - "Review all cards" escape hatch when board-scoped
 */
export function SessionSummary({
  reviewedCount,
  counts,
  nextReviewHuman,
  boardName,
}: SessionSummaryProps) {
  const navigate = useNavigate()
  const hasAnyRatings = Object.values(counts).some((n) => n > 0)

  return (
    <div className={styles.summary}>
      <div className={styles.glow} aria-hidden />

      <p className={styles.icon}>🎉</p>

      <Text variant="title" as="h2" className={styles.heading}>
        {reviewedCount > 0 ? 'Session complete' : 'All caught up'}
      </Text>

      {boardName && (
        <p className={styles.boardLabel}>
          <span className={styles.boardChip}>{boardName}</span>
        </p>
      )}

      {reviewedCount > 0 && (
        <p className={styles.count}>
          {reviewedCount} card{reviewedCount !== 1 ? 's' : ''} reviewed
        </p>
      )}

      {/* Rating breakdown — only show when at least one rating was given */}
      {hasAnyRatings && (
        <div className={styles.breakdown}>
          {RATING_CONFIG.map(({ value, label, icon, cls }) => {
            const n = counts[value]
            if (n === 0) return null
            return (
              <div key={value} className={[styles.breakdownItem, styles[`item_${cls}`]].join(' ')}>
                <span className={styles.breakdownIcon} aria-hidden>{icon}</span>
                <span className={styles.breakdownLabel}>{label}</span>
                <span className={styles.breakdownCount}>{n}</span>
              </div>
            )
          })}
        </div>
      )}

      {nextReviewHuman && (
        <p className={styles.nextLabel}>
          Next cards due{' '}
          <span className={styles.nextTime}>{nextReviewHuman.toLowerCase()}</span>
        </p>
      )}

      {/* If board-scoped, offer fallback to full queue */}
      {boardName && (
        <button
          type="button"
          className={styles.fallbackBtn}
          onClick={() => navigate('/review')}
        >
          Review all cards
        </button>
      )}
    </div>
  )
}
