import { useState } from 'react'
import type { Rating } from '../../../entities/review/model/types'
import { Text } from '../../../shared/ui/Typography/Typography'
import styles from './RatingButtons.module.css'

const RATINGS: { value: Rating; label: string; cls: string }[] = [
  { value: 'again', label: 'Again', cls: styles.again },
  { value: 'hard',  label: 'Hard',  cls: styles.hard  },
  { value: 'good',  label: 'Good',  cls: styles.good  },
  { value: 'easy',  label: 'Easy',  cls: styles.easy  },
]

// Shown once, before the user's very first-ever rating, then never again —
// same "explain once, contextually" pattern as the onboarding language
// question. No numbers/intervals in the copy, matching the no-gaming
// decision below.
const HINT_SEEN_KEY = 'rating-hint-seen'

interface Props {
  onRate: (rating: Rating) => void
  disabled?: boolean
}

/**
 * Four rating buttons. Deliberately no per-button next-review timing: the rating
 * should reflect how well the word was recalled, not when the user wants to see
 * it next — showing intervals up front invites gaming the schedule.
 */
export function RatingButtons({ onRate, disabled }: Props) {
  const [showHint] = useState(() => {
    try {
      return localStorage.getItem(HINT_SEEN_KEY) !== 'true'
    } catch {
      return false
    }
  })

  const handleRate = (rating: Rating) => {
    try {
      localStorage.setItem(HINT_SEEN_KEY, 'true')
    } catch {
      // localStorage unavailable — hint just won't be dismissable, not worth failing over
    }
    onRate(rating)
  }

  return (
    <div>
      {showHint && (
        <Text variant="caption" color="secondary" as="p" className={styles.hint}>
          Rate how well you remembered it — this decides when you'll see the word again.
        </Text>
      )}
      <div className={styles.row}>
        {RATINGS.map(({ value, label, cls }) => (
          <button
            key={value}
            onClick={() => handleRate(value)}
            disabled={disabled}
            className={[styles.btn, cls].join(' ')}
          >
            <span className={styles.mainLabel}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
