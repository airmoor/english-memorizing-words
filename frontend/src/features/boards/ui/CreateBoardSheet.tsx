import { useState, useRef, useEffect } from 'react'
import { AdaptiveSheet } from '../../../shared/ui/AdaptiveSheet/AdaptiveSheet'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
import { useCreateBoardMutation } from '../model/useCreateBoardMutation'
import styles from './CreateBoardSheet.module.css'

interface CreateBoardSheetProps {
  open: boolean
  onClose: () => void
  /** Called with the new board's id after successful creation */
  onCreated?: (boardId: string) => void
}

/**
 * Sheet / modal for creating a new board.
 * Validates that the name is non-empty; shows inline error on API failure.
 */
export function CreateBoardSheet({ open, onClose, onCreated }: CreateBoardSheetProps) {
  const [name,  setName]  = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef          = useRef<HTMLInputElement>(null)
  const mutation          = useCreateBoardMutation()

  // Focus input when sheet opens
  useEffect(() => {
    if (open) {
      setName('')
      setError(null)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Board name cannot be empty.')
      return
    }
    setError(null)
    try {
      const board = await mutation.mutateAsync({ name: trimmed })
      onCreated?.(board.id)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setError(
        msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist')
          ? 'A board with this name already exists.'
          : msg,
      )
    }
  }

  return (
    <AdaptiveSheet open={open} onClose={onClose} label="Create board">
      <BottomSheetContent>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className={styles.header}>
            <h2 className={styles.title}>Create board</h2>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <XIcon />
            </button>
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <div className={styles.body}>
            <label className={styles.label}>
              <span className={styles.labelText}>Board name</span>
              <div className={styles.inputWrap}>
                <input
                  ref={inputRef}
                  type="text"
                  className={[styles.input, error ? styles.inputError : ''].join(' ')}
                  placeholder="e.g. Business English"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null) }}
                  maxLength={50}
                  autoComplete="off"
                  aria-invalid={error !== null}
                  aria-describedby={error ? 'board-name-error' : undefined}
                />
                <span className={styles.charCount} aria-hidden="true">
                  {name.length}/50
                </span>
              </div>
            </label>

            {error && (
              <p id="board-name-error" className={styles.error} role="alert">
                {error}
              </p>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createBtn}
              disabled={mutation.isPending || !name.trim()}
            >
              {mutation.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </BottomSheetContent>
    </AdaptiveSheet>
  )
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  )
}
