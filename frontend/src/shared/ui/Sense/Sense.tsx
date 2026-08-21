import type { Meaning } from '../../../entities/word/model/types'
import { parseDefinition, renderWithEditorialNotes } from './parseDefinition'
import { ExampleSentence } from '../ExampleSentence/ExampleSentence'
import styles from './Sense.module.css'

interface Props {
  meaning: Meaning
  /** True when the sense_number is a sub-sense (e.g. "1a", "1b") so we can indent. */
  isSubSense: boolean
  /**
   * Auto-incrementing integer to display instead of the raw MW sense code.
   * Null for sub-senses — no number shown, just indented.
   */
  counter?: number | null
  /** When true, the row is tappable and shows a checkbox. */
  selectionMode?: boolean
  isSelected?: boolean
  onToggle?: (id: string) => void
  /** When true, this meaning was previously saved — shows accent highlight. */
  isSavedMeaning?: boolean
  /** Called when user clicks a "see also" cross-reference chip. */
  onSeeAlso?: (term: string) => void
}

/**
 * Renders a single sense inside a dictionary entry.
 * Pure display — no save state, no mutations.
 * Consumed by MeaningGroup inside WordDetailContent.
 *
 * Moved from features/word-search/ui/ to shared/ui/ so WordDetailContent
 * (in shared/) can use it without a layer violation.
 */
export function Sense({
  meaning,
  isSubSense,
  counter,
  selectionMode,
  isSelected,
  onToggle,
  isSavedMeaning,
  onSeeAlso,
}: Props) {
  const parsed = parseDefinition(meaning.definition)

  const liClasses = [
    styles.sense,
    isSubSense ? styles.subSense : '',
    selectionMode ? styles.senseSelectable : '',
    selectionMode && isSelected ? styles.senseSelected : '',
    !selectionMode && isSavedMeaning ? styles.senseSaved : '',
  ].filter(Boolean).join(' ')

  // In selection mode the checkbox replaces the counter column; always use auto 1fr.
  // Outside selection mode, sub-senses have no counter so they use 1-column layout.
  const rowNoCounter = !selectionMode && counter == null
  const rowClasses = [styles.row, rowNoCounter ? styles.rowNoCounter : ''].filter(Boolean).join(' ')

  return (
    <li
      className={liClasses}
      role={selectionMode ? 'checkbox' : undefined}
      aria-checked={selectionMode ? isSelected : undefined}
      onClick={selectionMode && onToggle ? () => onToggle(meaning.id) : undefined}
    >
      <div className={rowClasses}>
        {selectionMode && (
          <span
            className={[styles.checkbox, isSelected ? styles.checkboxChecked : ''].filter(Boolean).join(' ')}
            aria-hidden
          />
        )}
        {!selectionMode && counter != null && (
          <span className={styles.senseNumber}>
            {isSavedMeaning && <span className={styles.savedDot} aria-hidden />}
            {counter}
          </span>
        )}

        <div className={styles.body}>
          {/* Definition text — with [=...] editorial notes styled inline */}
          <p className={styles.definition}>
            {renderWithEditorialNotes(parsed.text).map((part, i) =>
              part.type === 'editorial' ? (
                <span key={i} className={styles.editorialNote}>{part.content}</span>
              ) : (
                <span key={i}>{part.content}</span>
              )
            )}
          </p>

          {/* "See also" cross-references — extracted from MW definition suffix */}
          {parsed.seeAlso.length > 0 && (
            <div className={styles.seeAlsoRow}>
              <span className={styles.seeAlsoLabel}>See also:</span>
              {parsed.seeAlso.map((term) => (
                <button
                  key={term}
                  type="button"
                  className={styles.seeAlsoChip}
                  onClick={(e) => {
                    e.stopPropagation() // don't trigger selection-mode toggle
                    onSeeAlso?.(term)
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          )}

          {meaning.examples.length > 0 && (
            <ul className={styles.examples}>
              {meaning.examples.slice(0, 3).map((ex, i) => (
                <li key={i}>
                  <ExampleSentence bare>
                    &ldquo;
                    {renderWithEditorialNotes(ex).map((part, j) =>
                      part.type === 'editorial' ? (
                        <span key={j} className={styles.editorialNote}>{part.content}</span>
                      ) : (
                        <span key={j}>{part.content}</span>
                      )
                    )}
                    &rdquo;
                  </ExampleSentence>
                </li>
              ))}
            </ul>
          )}

          {meaning.synonyms.length > 0 && (
            <div className={styles.synonyms}>
              {meaning.synonyms.slice(0, 8).map((syn) => (
                <span key={syn} className={styles.synonym}>{syn}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
