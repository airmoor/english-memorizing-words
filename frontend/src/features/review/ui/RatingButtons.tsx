import type { Rating } from '../../../entities/review/model/types'
import styles from './RatingButtons.module.css'

const RATINGS: { value: Rating; label: string; cls: string }[] = [
  { value: 'again', label: 'Again', cls: styles.again },
  { value: 'hard',  label: 'Hard',  cls: styles.hard  },
  { value: 'good',  label: 'Good',  cls: styles.good  },
  { value: 'easy',  label: 'Easy',  cls: styles.easy  },
]

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
  return (
    <div className={styles.row}>
      {RATINGS.map(({ value, label, cls }) => (
        <button
          key={value}
          onClick={() => onRate(value)}
          disabled={disabled}
          className={[styles.btn, cls].join(' ')}
        >
          <span className={styles.mainLabel}>{label}</span>
        </button>
      ))}
    </div>
  )
}
