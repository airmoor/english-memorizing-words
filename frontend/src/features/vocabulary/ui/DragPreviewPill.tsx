import styles from './DragPreviewPill.module.css'

interface Props {
  word: string
}

/**
 * Compact drag-ghost shown while dragging a vocabulary row onto a board — a
 * small pill rather than the full row, so it doesn't visually bury the drop
 * target underneath the cursor.
 */
export function DragPreviewPill({ word }: Props) {
  return (
    <div className={styles.pill}>
      <span className={styles.dot} aria-hidden="true" />
      {word}
    </div>
  )
}
