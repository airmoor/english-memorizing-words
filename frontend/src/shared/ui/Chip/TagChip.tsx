import { X } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import styles from './TagChip.module.css'

interface TagChipProps {
  label: string
  onRemove?: () => void
  /** aria-label for the remove button — defaults to "Remove tag <label>" */
  removeLabel?: string
}

/** Compact chip for displaying a tag, with an optional remove button. */
export function TagChip({ label, onRemove, removeLabel }: TagChipProps) {
  return (
    <span className={styles.chip}>
      <span className={styles.label}>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={[styles.remove, 'icon-action'].join(' ')}
          aria-label={removeLabel ?? `Remove tag ${label}`}
        >
          <Icon icon={X} size={10} />
        </button>
      )}
    </span>
  )
}
