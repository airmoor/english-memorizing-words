import { LayoutGrid, X } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import styles from './BoardChip.module.css'

interface BoardChipProps {
  label: string
  onRemove?: () => void
  /** aria-label for the remove button — defaults to "Remove from board <label>" */
  removeLabel?: string
}

/**
 * Compact chip for displaying a board assignment.
 * Visually distinct from TagChip (uses a different colour accent and a
 * grid icon) so boards and tags are immediately distinguishable.
 */
export function BoardChip({ label, onRemove, removeLabel }: BoardChipProps) {
  return (
    <span className={styles.chip}>
      <span className={styles.icon}>
        <Icon icon={LayoutGrid} size={11} />
      </span>
      <span className={styles.label}>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={[styles.remove, 'icon-action'].join(' ')}
          aria-label={removeLabel ?? `Remove from board ${label}`}
        >
          <Icon icon={X} size={10} />
        </button>
      )}
    </span>
  )
}
