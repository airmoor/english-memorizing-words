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
 * folder-style icon) so boards and tags are immediately distinguishable.
 */
export function BoardChip({ label, onRemove, removeLabel }: BoardChipProps) {
  return (
    <span className={styles.chip}>
      {/* Board icon glyph — distinguishes from TagChip at a glance */}
      <span className={styles.icon} aria-hidden="true">⊞</span>
      <span className={styles.label}>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={styles.remove}
          aria-label={removeLabel ?? `Remove from board ${label}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
