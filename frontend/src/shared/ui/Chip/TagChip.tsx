import styles from './TagChip.module.css'

interface TagChipProps {
  label: string
  onRemove?: () => void
  /** aria-label for the remove button — defaults to "Remove tag <label>" */
  removeLabel?: string
}

/** Compact chip for displaying a tag, with an optional × remove button. */
export function TagChip({ label, onRemove, removeLabel }: TagChipProps) {
  return (
    <span className={styles.chip}>
      <span className={styles.label}>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={styles.remove}
          aria-label={removeLabel ?? `Remove tag ${label}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
