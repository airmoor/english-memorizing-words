import type { PointerEventHandler } from 'react'
import styles from './DragHandle.module.css'

interface DragHandleProps {
  /** aria-label for screen readers — defaults to generic "Drag to dismiss" */
  label?: string
  /** Pointer-down handler passed from useBottomSheetGesture */
  onPointerDown?: PointerEventHandler<HTMLDivElement>
}

export function DragHandle({ label = 'Drag to dismiss', onPointerDown }: DragHandleProps) {
  return (
    <div
      className={styles.track}
      aria-hidden="true"
      onPointerDown={onPointerDown}
    >
      <div className={styles.pill} title={label} />
    </div>
  )
}
