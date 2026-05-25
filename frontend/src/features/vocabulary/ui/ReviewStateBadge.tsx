import type { ReviewState } from '../../../entities/vocabulary/model/types'
import styles from './ReviewStateBadge.module.css'

interface ReviewStateBadgeProps {
  reviewState: ReviewState
  nextReviewHuman: string | null
}

const STATE_CONFIG: Record<ReviewState, { label: string; mod: string }> = {
  new:      { label: 'New',      mod: 'new'      },
  due:      { label: 'Due',      mod: 'due'      },
  upcoming: { label: '',         mod: 'upcoming' },
  mastered: { label: 'Mastered', mod: 'mastered' },
}

/**
 * Compact badge showing the card's review state.
 * - "New" and "Due" always show their label.
 * - "Upcoming" shows the humanised next-review string (e.g. "In 2 days").
 * - "Mastered" shows a small badge.
 *
 * Returns null for unknown states — the server contract says ReviewState is
 * 'new' | 'due' | 'upcoming' | 'mastered', but we guard against stale API
 * responses returning the legacy values ('learning', 'review', 'mature').
 */
export function ReviewStateBadge({ reviewState, nextReviewHuman }: ReviewStateBadgeProps) {
  const config = STATE_CONFIG[reviewState]

  // Guard: unknown state from server (e.g. legacy 'learning', 'review', 'mature').
  // Render nothing rather than crashing — the real fix is in computeReviewState.
  if (!config) return null

  // Upcoming: only render if we have a human string, otherwise skip
  if (reviewState === 'upcoming') {
    if (!nextReviewHuman) return null
    return (
      <span className={[styles.badge, styles[`badge_${config.mod}`]].join(' ')}>
        {nextReviewHuman}
      </span>
    )
  }

  return (
    <span className={[styles.badge, styles[`badge_${config.mod}`]].join(' ')}>
      {config.label}
    </span>
  )
}
