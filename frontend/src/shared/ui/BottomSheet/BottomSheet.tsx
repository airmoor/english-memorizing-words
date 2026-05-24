import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { BottomSheetBackdrop } from './BottomSheetBackdrop'
import { DragHandle } from './DragHandle'
import styles from './BottomSheet.module.css'
import { nextSheetId, useSheetContext } from './SheetContext'
import { useBottomSheetGesture } from './useBottomSheetGesture'
import { useKeyboardAvoidance } from './useKeyboardAvoidance'

interface BottomSheetProps {
  /** Whether the sheet is visible */
  open: boolean
  /** Called when the sheet should close (swipe, backdrop, Escape) */
  onClose: () => void
  /** Accessible label for the dialog */
  label: string
  children: ReactNode
  /**
   * ID of the element that labels the dialog — if provided, `aria-labelledby`
   * is used instead of `aria-label`.
   */
  labelId?: string
}

/**
 * Bottom sheet with:
 *   - Portal rendering (mounts directly on <body>)
 *   - Animated entrance / exit (CSS transform, no JS timers)
 *   - Swipe-down-to-dismiss gesture (pointer events)
 *   - Backdrop tap to dismiss
 *   - Escape key to dismiss (top sheet only)
 *   - `role="dialog"` + `aria-modal` + focus trap
 *   - `visualViewport` keyboard avoidance (iOS / Android Chrome)
 *   - Nested sheet support via SheetContext
 */
export function BottomSheet({
  open,
  onClose,
  label,
  labelId,
  children,
}: BottomSheetProps) {
  const sheetId  = useRef(nextSheetId()).current
  const panelRef = useRef<HTMLDivElement>(null)
  const { pushSheet, popSheet, isTopSheet } = useSheetContext()

  // Track "render phase" to drive the CSS entrance animation.
  // We need to render the panel for at least one frame before adding
  // .panelVisible so the browser picks up the initial translateY(100%).
  const [mounted, setMounted]     = useState(false)
  const [visible, setVisible]     = useState(false)
  const [exiting, setExiting]     = useState(false)

  // Entrance: open → mount → one-frame delay → add visible class
  useEffect(() => {
    if (open) {
      setExiting(false)
      setMounted(true)
      pushSheet(sheetId)
      // rAF ensures the browser sees the initial off-screen position first
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    } else {
      // Exit: remove visible class → wait for transition → unmount
      setVisible(false)
      setExiting(true)
      popSheet(sheetId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Unmount after the exit transition completes (~300ms)
  useEffect(() => {
    if (!exiting) return
    const tid = setTimeout(() => {
      setMounted(false)
      setExiting(false)
    }, 320)
    return () => clearTimeout(tid)
  }, [exiting])

  // ── Dismiss callback ───────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (isTopSheet(sheetId)) onClose()
  }, [isTopSheet, onClose, sheetId])

  // ── Escape key ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTopSheet(sheetId)) {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isTopSheet, onClose, sheetId])

  // ── Focus trap ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !panelRef.current) return
    const panel = panelRef.current

    // Focus the panel itself on open so screen readers announce it
    panel.focus({ preventScroll: true })

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
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

    panel.addEventListener('keydown', handleFocusTrap)
    return () => panel.removeEventListener('keydown', handleFocusTrap)
  }, [open, mounted])

  // ── Body scroll lock ─────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  // ── Drag gesture ─────────────────────────────────────────────────
  const dragBindings = useBottomSheetGesture({
    panelRef,
    onDismiss: dismiss,
  })

  // ── Keyboard avoidance ───────────────────────────────────────────
  useKeyboardAvoidance({ containerRef: panelRef, enabled: open })

  if (!mounted) return null

  const panelCls = [
    styles.panel,
    visible && !exiting ? styles.panelVisible : '',
    exiting ? styles.panelExit : '',
  ].filter(Boolean).join(' ')

  return createPortal(
    <>
      <BottomSheetBackdrop onClick={dismiss} />
      <div
        ref={panelRef}
        className={panelCls}
        role="dialog"
        aria-modal="true"
        aria-label={labelId ? undefined : label}
        aria-labelledby={labelId}
        tabIndex={-1}
      >
        {/* Drag handle — pointer events start here for gesture */}
        <DragHandle {...dragBindings} />
        {children}
      </div>
    </>,
    document.body,
  )
}
