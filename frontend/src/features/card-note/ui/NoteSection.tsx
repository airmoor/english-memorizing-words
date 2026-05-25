import { useState, useRef, useEffect } from 'react'
import type { CardNote } from '../../../entities/card-note/model/types'
import { useCardNoteMutation } from '../model/useCardNoteMutation'
import styles from './NoteSection.module.css'

interface NoteSectionProps {
  cardId: string
  note: CardNote | null
}

/**
 * Expandable inline-edit note section for the card detail view.
 *
 * - Shows placeholder text when empty
 * - Tap to activate textarea edit mode
 * - Saves on blur (debounced to avoid racing saves while typing)
 * - Clears the note when content is empty on blur
 */
export function NoteSection({ cardId, note }: NoteSectionProps) {
  const [editing, setEditing] = useState(false)
  const [value,   setValue]   = useState(note?.body ?? '')
  const textareaRef           = useRef<HTMLTextAreaElement>(null)
  const mutation              = useCardNoteMutation()

  // Keep local value in sync when note prop changes externally
  // (e.g. after invalidation bringing fresh server data)
  useEffect(() => {
    if (!editing) {
      setValue(note?.body ?? '')
    }
  }, [note?.body, editing])

  const startEditing = () => {
    setEditing(true)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const handleBlur = () => {
    setEditing(false)
    const trimmed = value.trim()
    const current = note?.body?.trim() ?? ''
    // Only save if the value actually changed
    if (trimmed !== current) {
      mutation.mutate({ cardId, body: trimmed })
    }
  }

  const isSaving = mutation.isPending

  return (
    <section className={styles.section} aria-label="Note">
      <div className={styles.header}>
        <span className={styles.title}>Note</span>
        {isSaving && <span className={styles.saving} aria-live="polite">Saving…</span>}
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
        <p className={styles.error} role="alert">
          Failed to save. Tap to retry.
        </p>
      )}
    </section>
  )
}
