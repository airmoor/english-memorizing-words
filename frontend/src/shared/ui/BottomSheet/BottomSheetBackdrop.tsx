import styles from './BottomSheetBackdrop.module.css'

interface BottomSheetBackdropProps {
  /** Called when the backdrop is tapped/clicked */
  onClick?: () => void
}

/**
 * Semi-transparent overlay rendered beneath the sheet panel.
 * Tapping it dismisses the sheet.
 */
export function BottomSheetBackdrop({ onClick }: BottomSheetBackdropProps) {
  return (
    <div
      className={styles.backdrop}
      onClick={onClick}
      // Backdrop is presentational — the dialog label covers accessibility
      aria-hidden="true"
    />
  )
}
