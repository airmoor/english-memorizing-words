import type { LucideIcon } from 'lucide-react'
import { Sparkles, Circle, Clock, Check } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import type { ReviewState } from '../../../entities/vocabulary/model/types'
import styles from './ReviewTimingLabel.module.css'

interface ReviewTimingLabelProps {
  /** Human-readable timing string, e.g. "In 3 days", "Overdue", "Tomorrow" */
  label: string
  /** Review state used to apply the correct colour variant */
  reviewState?: ReviewState
  /** Prepend a clock/calendar icon (default: true) */
  showIcon?: boolean
}

/** Maps review state to the CSS variant class and Lucide icon */
const STATE_CONFIG: Record<ReviewState, { cls: string; icon: LucideIcon }> = {
  new:      { cls: styles.new,      icon: Sparkles },
  due:      { cls: styles.due,      icon: Circle },
  upcoming: { cls: styles.soon,     icon: Clock },
  mastered: { cls: styles.mastered, icon: Check },
}

/**
 * Compact inline label that shows a review timing string with a colour-coded
 * state indicator. Colour semantics:
 *   - new      → accent blue
 *   - due      → warning amber (needs review today / overdue)
 *   - upcoming → success green (due soon but not yet)
 *   - mastered → muted (long interval, no urgency)
 *
 * Pass `reviewState` to enable colour coding; omit for a plain secondary-text label.
 */
export function ReviewTimingLabel({
  label,
  reviewState,
  showIcon = true,
}: ReviewTimingLabelProps) {
  const isOverdue = label.toLowerCase().startsWith('overdue')
  const config = reviewState ? STATE_CONFIG[reviewState] : null

  // Overdue gets special danger colour regardless of the computed reviewState
  const variantCls = isOverdue ? styles.overdue : (config?.cls ?? '')

  return (
    <span className={[styles.label, variantCls].join(' ').trim()}>
      {showIcon && config && (
        <span className={styles.icon} aria-hidden="true">
          <Icon icon={config.icon} size={11} strokeWidth={2} />
        </span>
      )}
      {label}
    </span>
  )
}
