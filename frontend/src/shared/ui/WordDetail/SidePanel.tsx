import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type ReactNode,
} from 'react'
import styles from './SidePanel.module.css'

interface Props {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  /**
   * When activeWordId changes while the panel is open, the content cross-fades.
   * Pass the activeWordId here so the panel can trigger the fade on change.
   */
  contentKey?: string | null
}

/**
 * Desktop side panel container for word detail.
 *
 * Behavior (spec §5.2):
 * - Fixed 380px panel width that pushes the list (layout compression, not overlay).
 * - role="complementary" — coexists with main content without trapping focus.
 * - Escape key closes the panel; focus returns to the active list row.
 * - Content cross-fade (150ms) when contentKey changes — word-to-word navigation.
 * - No focus trap — users tab freely between the list and the panel.
 *
 * Layout requirement:
 * The parent element must be display:flex + flex-direction:row so the panel
 * sits beside the list rather than over it. WordDetailContainer handles this.
 *
 * Reduced motion: transitions collapse to 0ms (§17.6, §18.5).
 */
export function SidePanel({ isOpen, onClose, children, contentKey }: Props) {
  const triggerRef = useRef<Element | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  const [isExiting, setIsExiting] = useState(false)
  const [isFading, setIsFading] = useState(false)

  // ── Capture trigger element for focus restoration ─────────────────────────
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement
      setIsExiting(false)
    }
  }, [isOpen])

  // ── Announce open to screen readers by moving focus to panel ─────────────
  useEffect(() => {
    if (!isOpen || isExiting) return
    const id = requestAnimationFrame(() => {
      panelRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen, isExiting])

  // ── Close handler: animate out, restore focus ────────────────────────────
  const handleClose = useCallback(() => {
    setIsExiting(true)
    const id = setTimeout(() => {
      setIsExiting(false)
      onClose()
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

  // ── Content cross-fade on word-to-word navigation ─────────────────────────
  // When contentKey changes (different word selected), briefly fade to 0
  // then fade back in. See spec §6.4, §18.
  const prevContentKey = useRef(contentKey)
  useEffect(() => {
    if (!isOpen) return
    if (contentKey !== prevContentKey.current) {
      prevContentKey.current = contentKey
      setIsFading(true)
      const id = setTimeout(() => setIsFading(false), 150)
      return () => clearTimeout(id)
    }
  }, [contentKey, isOpen])

  if (!isOpen && !isExiting) return null

  return (
    <aside
      ref={panelRef}
      role="complementary"
      aria-label="Word detail"
      // tabIndex=-1 allows programmatic focus without being in the natural tab order
      tabIndex={-1}
      className={[
        styles.panel,
        isExiting ? styles.panelExiting : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Panel header — close button only */}
      <div className={styles.header}>
        <button
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="Close word detail"
        >
          ×
        </button>
      </div>

      {/* Scrollable content — cross-fades on word-to-word navigation */}
      <div
        className={isFading ? styles.contentFading : styles.contentVisible}
        aria-live="polite"
        aria-atomic="true"
      >
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </aside>
  )
}
