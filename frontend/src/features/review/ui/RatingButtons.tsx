import type { NextReviewPreviews, Rating } from '../../../entities/review/model/types'
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
  /**
   * When provided, each button shows a timing sub-label beneath the rating
   * name (e.g. "In 3 days", "Tomorrow"). Obtained from `CardAnswer.nextReviewPreviews`.
   */
  previews?: NextReviewPreviews
}

export function RatingButtons({ onRate, disabled, previews }: Props) {
  return (
    <div className={styles.row}>
      {RATINGS.map(({ value, label, cls }) => {
        const subLabel = previews?.[value]?.human
        return (
          <button
            key={value}
            onClick={() => onRate(value)}
            disabled={disabled}
            className={[styles.btn, cls, subLabel ? styles.withSub : ''].join(' ').trim()}
          >
            {subLabel && (
              <span className={styles.subLabel}>{subLabel}</span>
            )}
            <span className={styles.mainLabel}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
