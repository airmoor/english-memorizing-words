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
          {label}
        </button>
      ))}
    </div>
  )
}
