import type { ReactNode } from 'react'
import styles from './BottomSheetContent.module.css'

interface BottomSheetContentProps {
  children: ReactNode
  className?: string
}

/**
 * Scrollable content area inside a BottomSheet.
 * Includes iOS momentum scrolling and `overscroll-behavior: contain` so
 * the page behind doesn't scroll when the sheet reaches its top/bottom.
 */
export function BottomSheetContent({ children, className }: BottomSheetContentProps) {
  return (
    <div className={[styles.content, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
