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
   * Changes when the active word changes.
   * Used to reset scroll position when navigating between words.
   */
  contentKey?: string | null
}

/**
 * Desktop side panel container for word detail.
 *
 * Behavior (spec §5.2):
 * - Sticky panel beside the vocabulary list (CSS grid layout in WordDetailContainer).
 * - role="complementary" — coexists with main content without trapping focus.
 * - Escape key closes the panel; focus returns to the active list row.
 * - Scroll-to-top when contentKey changes (word-to-word navigation).
 * - No focus trap — users tab freely between the list and the panel.
 * - Floating × close button pinned to the top-right corner of the panel
 *   (always visible regardless of scroll position in the content body).
 *
 * Reduced motion: transitions collapse to 0ms (§17.6, §18.5).
 */
export function SidePanel({ isOpen, onClose, children, contentKey }: Props) {
  const triggerRef = useRef<Element | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const prevContentKey = useRef(contentKey)
  const [isExiting, setIsExiting] = useState(false)

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

  // ── Scroll-to-top on word change ──────────────────────────────────────────
  // When contentKey changes the body snaps to the top so the new word's
  // heading is always visible without a leftover scroll offset.
  useEffect(() => {
    if (!isOpen) return
    if (contentKey !== prevContentKey.current) {
      prevContentKey.current = contentKey
      if (bodyRef.current) {
        bodyRef.current.scrollTop = 0
      }
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
      {/* Scrollable content body.
          The × close button now lives inside DictionaryHeader (vocabulary context),
          aligned on the same row as the word title. Escape key still works via the
          keyboard handler above. */}
      <div ref={bodyRef} className={styles.body}>
        {children}
      </div>
    </aside>
  )
}
