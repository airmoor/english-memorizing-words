import { useState, useRef, useEffect, useCallback } from 'react'
import type { CardNote } from '../../../entities/card-note/model/types'
import { useCardNoteMutation } from '../model/useCardNoteMutation'
import styles from './NoteSection.module.css'

interface NoteSectionProps {
  cardId: string
  note: CardNote | null
}

/**
 * Inline-edit note section for the card detail view.
 *
 * UX behaviour (Phase 5):
 * - Placeholder text when empty — tap to activate edit mode
 * - Inline textarea (no modal, no separate screen)
 * - Saves on blur — debounce-free, server call on every blur that changed value
 * - Empty body on blur → calls PUT with empty string → backend deletes the note row
 * - Error state: inline banner with Retry button; typed text is always preserved
 * - Retry: re-fires the last mutation; user never loses their text
 * - Editing clears any previous error state
 */
export function NoteSection({ cardId, note }: NoteSectionProps) {
  const [editing, setEditing]       = useState(false)
  const [value,   setValue]         = useState(note?.body ?? '')
  const textareaRef                 = useRef<HTMLTextAreaElement>(null)
  const mutation                    = useCardNoteMutation()

  // Track the last attempted save value so Retry can re-fire it
  const lastAttemptRef = useRef<string>('')

  // Keep local value in sync when the note prop updates from the server
  // (e.g. after query invalidation). Skip sync while actively editing to
  // prevent losing in-progress text.
  useEffect(() => {
    if (!editing) {
      setValue(note?.body ?? '')
    }
  }, [note?.body, editing])

  const startEditing = useCallback(() => {
    // Clear stale error when user reopens the editor
    mutation.reset()
    setEditing(true)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [mutation])

  const commitSave = useCallback((trimmed: string) => {
    const current = note?.body?.trim() ?? ''
    if (trimmed === current) return // nothing changed — skip network call

    lastAttemptRef.current = trimmed
    mutation.mutate({ cardId, body: trimmed })
  }, [cardId, note?.body, mutation])

  const handleBlur = useCallback(() => {
    setEditing(false)
    commitSave(value.trim())
  }, [value, commitSave])

  const handleRetry = useCallback(() => {
    mutation.reset()
    mutation.mutate({ cardId, body: lastAttemptRef.current })
  }, [cardId, mutation])

  const isDeleting = mutation.isPending && lastAttemptRef.current === ''
  const isSaving   = mutation.isPending && !isDeleting

  return (
    <section className={styles.section} aria-label="Note">
      <div className={styles.header}>
        <span className={styles.title}>Note</span>
        {isSaving && (
          <span className={styles.statusLabel} aria-live="polite">Saving…</span>
        )}
        {isDeleting && (
          <span className={styles.statusLabel} aria-live="polite">Clearing…</span>
        )}
      </div>

      {editing ? (
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          placeholder="Add a personal note…"
          rows={3}
          aria-label="Edit note"
        />
      ) : (
        <button
          type="button"
          className={[styles.display, !value ? styles.placeholder : ''].join(' ')}
          onClick={startEditing}
          aria-label={value ? `Edit note: ${value}` : 'Add a personal note'}
        >
          {value || 'Tap to add a note…'}
        </button>
      )}

      {mutation.isError && (
        <div className={styles.errorRow} role="alert">
          <span className={styles.errorMsg}>
            {lastAttemptRef.current === ''
              ? 'Failed to clear note.'
              : 'Failed to save.'}
          </span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      )}
    </section>
  )
}
