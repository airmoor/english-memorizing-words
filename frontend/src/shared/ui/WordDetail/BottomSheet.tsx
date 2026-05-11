import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './BottomSheet.module.css'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** word detail heading element ID — for aria-labelledby */
  labelId: string
  children: ReactNode
  /** Whether prev navigation is available */
  canNavigatePrev?: boolean
  /** Whether next navigation is available */
  canNavigateNext?: boolean
  onNavigatePrev?: () => void
  onNavigateNext?: () => void
  /** Shown between nav arrows */
  navLabel?: string
}

const DISMISS_THRESHOLD = 0.3  // drag below 30% of sheet height → dismiss
const SNAP_FULL_THRESHOLD = 0.25 // drag up beyond 25% of remaining space → snap to full

/**
 * Mobile bottom sheet container for word detail.
 *
 * Behavior (spec §5.1):
 * - Default height: 70svh. Full expand: 95svh.
 * - Drag handle: drag down to dismiss, drag up to expand.
 * - Backdrop: tap to close.
 * - Focus trap: Tab cycles within the sheet.
 * - Focus restoration: returns focus to the triggering element on close.
 * - role="dialog" + aria-modal="true"
 * - Escape key closes.
 *
 * Reduced motion: transitions collapse to 0ms (§17.6, §18.5).
 */
export function BottomSheet({
  isOpen,
  onClose,
  labelId,
  children,
  canNavigatePrev = false,
  canNavigateNext = false,
  onNavigatePrev,
  onNavigateNext,
  navLabel,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // ── Drag state ────────────────────────────────────────────────────────────
  const dragStartY = useRef(0)
  const dragCurrentY = useRef(0)
  const isDragging = useRef(false)

  // ── Capture trigger element for focus restoration ─────────────────────────
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement
      setIsExiting(false)
      setIsExpanded(false)
    }
  }, [isOpen])

  // ── Focus first element on open ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || isExiting) return
    // Allow the animation frame to complete, then focus
    const id = requestAnimationFrame(() => {
      const sheet = sheetRef.current
      if (!sheet) return
      const first = sheet.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      first?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen, isExiting])

  // ── Close handler: animate out, then call onClose ────────────────────────
  const handleClose = useCallback(() => {
    setIsExiting(true)
    // Duration matches CSS exit animation (160ms). Add small buffer.
    const id = setTimeout(() => {
      setIsExiting(false)
      onClose()
      // Restore focus to the element that opened the sheet
      if (triggerRef.current && 'focus' in triggerRef.current) {
        (triggerRef.current as HTMLElement).focus()
      }
    }, 175)
    return () => clearTimeout(id)
  }, [onClose])

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, handleClose])

  // ── Focus trap ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || isExiting) return

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const sheet = sheetRef.current
      if (!sheet) return

      const focusable = Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen, isExiting])

  // ── Drag to dismiss / expand ──────────────────────────────────────────────
  const onHandlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!sheetRef.current) return
    isDragging.current = true
    dragStartY.current = e.clientY
    dragCurrentY.current = e.clientY
    ;(e.target as HTMLDivElement).setPointerCapture(e.pointerId)
  }, [])

  const onHandlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !sheetRef.current) return
    dragCurrentY.current = e.clientY
    const delta = dragCurrentY.current - dragStartY.current
    // Only allow dragging down (delta > 0) for dismiss
    const clampedDelta = Math.max(0, delta)
    sheetRef.current.style.transform = `translateY(${clampedDelta}px)`
    sheetRef.current.style.transition = 'none'
  }, [])

  const onHandlePointerUp = useCallback(() => {
    if (!isDragging.current || !sheetRef.current) return
    isDragging.current = false

    const sheet = sheetRef.current
    const delta = dragCurrentY.current - dragStartY.current
    const sheetHeight = sheet.getBoundingClientRect().height

    // Reset inline style — CSS transition takes over
    sheet.style.transform = ''
    sheet.style.transition = ''

    const ratio = delta / sheetHeight
    if (ratio > DISMISS_THRESHOLD) {
      // Dragged down far enough — dismiss
      handleClose()
    } else if (delta < -(sheetHeight * SNAP_FULL_THRESHOLD)) {
      // Dragged up far enough — expand to full height
      setIsExpanded(true)
    } else {
      // Snap back to default position
      setIsExpanded(false)
    }
  }, [handleClose])

  if (!isOpen && !isExiting) return null

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={[styles.backdrop, isExiting ? styles.backdropExiting : ''].join(' ')}
        role="presentation"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className={[
          styles.sheet,
          isExpanded ? styles.sheetExpanded : '',
          isExiting ? styles.sheetExiting : '',
        ].filter(Boolean).join(' ')}
      >
        {/* Drag handle */}
        <div
          className={styles.handle}
          aria-hidden="true"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <div className={styles.handleBar} />
        </div>

        {/* Scrollable content */}
        <div className={styles.body}>
          {children}
        </div>

        {/* Navigation bar */}
        <nav className={styles.nav} aria-label="Word navigation">
          <button
            className={styles.navBtn}
            onClick={onNavigatePrev}
            disabled={!canNavigatePrev}
            aria-label="Previous word"
          >
            ‹
          </button>

          {navLabel && (
            <span className={styles.navLabel} aria-hidden="true">
              {navLabel}
            </span>
          )}

          <button
            className={styles.navBtn}
            onClick={onNavigateNext}
            disabled={!canNavigateNext}
            aria-label="Next word"
          >
            ›
          </button>
        </nav>
      </div>
    </>,
    document.body,
  )
}
