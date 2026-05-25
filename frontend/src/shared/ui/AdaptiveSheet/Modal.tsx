import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

interface ModalProps {
  open: boolean
  onClose: () => void
  label: string
  labelId?: string
  children: ReactNode
}

/**
 * Centered modal dialog for desktop (≥1024px).
 *
 * - Portal rendering (mounts on <body>)
 * - Fade + scale entrance / exit animation
 * - Backdrop click to dismiss
 * - Escape key to dismiss
 * - `role="dialog"` + `aria-modal` + focus trap
 * - Body scroll lock while open
 */
export function Modal({ open, onClose, label, labelId, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted,  setMounted]  = useState(false)
  const [visible,  setVisible]  = useState(false)
  const [exiting,  setExiting]  = useState(false)

  // Entrance
  useEffect(() => {
    if (open) {
      setExiting(false)
      setMounted(true)
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    } else {
      setVisible(false)
      setExiting(true)
    }
  }, [open])

  // Unmount after exit transition
  useEffect(() => {
    if (!exiting) return
    const tid = setTimeout(() => { setMounted(false); setExiting(false) }, 200)
    return () => clearTimeout(tid)
  }, [exiting])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Focus trap
  useEffect(() => {
    if (!open || !panelRef.current) return
    const panel = panelRef.current
    panel.focus({ preventScroll: true })

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    panel.addEventListener('keydown', handleTab)
    return () => panel.removeEventListener('keydown', handleTab)
  }, [open, mounted])

  // Body scroll lock
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  if (!mounted) return null

  const panelCls = [
    styles.panel,
    visible && !exiting ? styles.panelVisible : '',
    exiting ? styles.panelExit : '',
  ].filter(Boolean).join(' ')

  const backdropCls = [
    styles.backdrop,
    exiting ? styles.backdropExit : '',
  ].filter(Boolean).join(' ')

  return createPortal(
    <>
      <div className={backdropCls} onClick={handleBackdrop} aria-hidden="true" />
      <div
        ref={panelRef}
        className={panelCls}
        role="dialog"
        aria-modal="true"
        aria-label={labelId ? undefined : label}
        aria-labelledby={labelId}
        tabIndex={-1}
      >
        {children}
      </div>
    </>,
    document.body,
  )
}
