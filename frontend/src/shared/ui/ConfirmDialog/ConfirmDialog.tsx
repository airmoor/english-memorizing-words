import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './ConfirmDialog.module.css'

interface Props {
  isOpen: boolean
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  /** Danger-colors the confirm button (default: true). */
  danger?: boolean
}

/**
 * A lightweight confirmation dialog rendered via a portal.
 *
 * - Traps focus inside the dialog while open.
 * - Closes on Escape or backdrop click.
 * - Restores focus to the trigger element on close.
 * - Accessible: role="alertdialog", aria-modal, aria-labelledby.
 */
export function ConfirmDialog({
  isOpen,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = true,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  // Capture trigger and lock body scroll
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Move focus into dialog
  useEffect(() => {
    if (!isOpen) return
    const id = requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen])

  // Restore focus on close
  useEffect(() => {
    if (!isOpen && triggerRef.current && 'focus' in triggerRef.current) {
      ;(triggerRef.current as HTMLElement).focus()
    }
  }, [isOpen])

  // Escape to cancel
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  // Focus trap
  useEffect(() => {
    if (!isOpen) return
    const el = dialogRef.current
    if (!el) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = Array.from(
        el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((n) => !n.hasAttribute('disabled'))
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
    el.addEventListener('keydown', handler)
    return () => el.removeEventListener('keydown', handler)
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className={styles.dialog}
      >
        <p id="confirm-dialog-title" className={styles.title}>{title}</p>
        {body && <p className={styles.body}>{body}</p>}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={[styles.confirmBtn, danger ? styles.confirmDanger : ''].filter(Boolean).join(' ')}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
