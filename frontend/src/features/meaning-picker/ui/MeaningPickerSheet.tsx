import { useState, useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { AdaptiveSheet } from '../../../shared/ui/AdaptiveSheet/AdaptiveSheet'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
import { useSaveSelectedMeaningsMutation } from '../api/useSaveSelectedMeaningsMutation'
import type { MeaningPayload } from '../../../shared/ui/WordDetail/types'
import styles from './MeaningPickerSheet.module.css'

interface MeaningPickerSheetProps {
  open: boolean
  onClose: () => void
  /** The word being saved */
  wordId: string
  wordText: string
  /** All available meanings from the dictionary response */
  meanings: MeaningPayload[]
  /**
   * IDs of meanings already saved (non-empty on re-open for existing words).
   * These are pre-selected when the sheet opens.
   */
  savedMeaningIds?: string[]
  /** Called after a successful save so the parent can update its state */
  onSaved?: () => void
}

/**
 * Meaning picker — shown before saving a word to vocabulary.
 *
 * UX design decisions:
 * - All meanings are pre-selected by default (Option C from open-questions Q15),
 *   overriding the spec default (Option A). Rationale: matches existing "save all"
 *   behaviour, adds zero friction for users who want everything, and lets power
 *   users quickly deselect unwanted meanings.
 * - "Select all / Deselect all" toggle at the top avoids the need to check/
 *   uncheck every meaning individually.
 * - Save button is disabled when nothing is selected (spec requirement).
 * - Button label: "Save N meaning(s)" — updates as selection changes.
 * - Re-open: if `savedMeaningIds` is provided (non-empty), those IDs are
 *   pre-selected instead of all meanings.
 */
export function MeaningPickerSheet({
  open,
  onClose,
  wordId,
  wordText,
  meanings,
  savedMeaningIds = [],
  onSaved,
}: MeaningPickerSheetProps) {
  // Determine initial selection:
  // - Re-open (word already saved): pre-select the IDs that were previously saved.
  //   If savedMeaningIds is empty (legacy "save all"), fall back to all-selected.
  // - First save: select all meanings by default.
  const initialIds = useMemo<Set<string>>(() => {
    if (savedMeaningIds.length > 0) {
      return new Set(savedMeaningIds)
    }
    return new Set(meanings.map((m) => m.id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]) // recalculate only when sheet opens/closes

  const [selected, setSelected] = useState<Set<string>>(initialIds)

  // Recalculate when `open` transitions to true (re-open with fresh data)
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setSelected(
        savedMeaningIds.length > 0
          ? new Set(savedMeaningIds)
          : new Set(meanings.map((m) => m.id)),
      )
    }
  }

  const saveMutation = useSaveSelectedMeaningsMutation()

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const allSelected = selected.size === meanings.length
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(meanings.map((m) => m.id)))
    }
  }

  const handleSave = () => {
    const meaningIds = [...selected]
    saveMutation.mutate(
      { wordId, meaningIds },
      {
        onSuccess: () => {
          onSaved?.()
          onClose()
        },
      },
    )
  }

  const count = selected.size
  const saveLabel =
    saveMutation.isPending
      ? 'Saving…'
      : count === 0
        ? 'Select at least one meaning'
        : count === 1
          ? 'Save 1 meaning'
          : `Save ${count} meanings`

  return (
    <AdaptiveSheet open={open} onClose={onClose} label="Choose meanings">
      <BottomSheetContent>
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Save &ldquo;{wordText}&rdquo;</h2>
            <p className={styles.subtitle}>Choose which meanings to add to your vocabulary</p>
          </div>
          <button
            type="button"
            className={[styles.closeBtn, 'icon-action'].join(' ')}
            onClick={onClose}
            aria-label="Cancel"
          >
            <Icon icon={X} size={16} />
          </button>
        </div>

        {/* ── Select all toggle ─────────────────────────────────────────── */}
        <div className={styles.selectAllRow}>
          <button
            type="button"
            className={styles.selectAllBtn}
            onClick={toggleAll}
          >
            <span className={[styles.checkbox, allSelected ? styles.checkboxChecked : ''].join(' ')} aria-hidden="true">
              {allSelected && <Icon icon={Check} size={11} strokeWidth={3} />}
            </span>
            <span className={styles.selectAllLabel}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </span>
          </button>
          <span className={styles.countBadge} aria-live="polite">
            {count}/{meanings.length}
          </span>
        </div>

        {/* ── Meaning list ───────────────────────────────────────────────── */}
        <ul className={styles.list} role="list">
          {meanings.map((m) => {
            const checked = selected.has(m.id)
            return (
              <li key={m.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  className={[styles.row, checked ? styles.rowChecked : ''].join(' ')}
                  onClick={() => toggle(m.id)}
                >
                  <span
                    className={[styles.checkbox, checked ? styles.checkboxChecked : ''].join(' ')}
                    aria-hidden="true"
                  >
                    {checked && <Icon icon={Check} size={11} strokeWidth={3} />}
                  </span>
                  <span className={styles.rowBody}>
                    {m.partOfSpeech && (
                      <span className={styles.pos}>{m.partOfSpeech}</span>
                    )}
                    <span className={styles.definition}>{m.definition}</span>
                    {m.examples.length > 0 && (
                      <span className={styles.example}>&ldquo;{m.examples[0]}&rdquo;</span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {/* ── Save footer ────────────────────────────────────────────────── */}
        <div className={styles.footer}>
          {saveMutation.isError && (
            <p className={styles.errorMsg} role="alert">
              Save failed — please try again.
            </p>
          )}
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={count === 0 || saveMutation.isPending}
          >
            {saveLabel}
          </button>
        </div>
      </BottomSheetContent>
    </AdaptiveSheet>
  )
}

