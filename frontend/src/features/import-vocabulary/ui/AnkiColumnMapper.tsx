import { useState } from 'react'
import type { ColumnSuggestion } from '../../../shared/lib/import/parsers/types'
import styles from './AnkiColumnMapper.module.css'

interface AnkiColumnMapperProps {
  suggestions: ColumnSuggestion[]
  rawText: string
  onConfirm: (wordColumnIndex: number, tagsColumnIndex?: number) => void
  onBack: () => void
}

export function AnkiColumnMapper({ suggestions, onConfirm, onBack }: AnkiColumnMapperProps) {
  // Default: pre-select the highest-confidence column
  const [selectedWord, setSelectedWord] = useState<number>(suggestions[0]?.index ?? 0)
  const [selectedTags, setSelectedTags] = useState<number | undefined>(undefined)

  const handleConfirm = () => {
    onConfirm(selectedWord, selectedTags)
  }

  // Limit display to max 6 columns, horizontally scrollable
  const displaySuggestions = suggestions.slice(0, 6)

  return (
    <div className={styles.mapper}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Back
        </button>
        <h2 className={styles.title}>Select word column</h2>
      </div>

      {/* ── Limitation notice ────────────────────────────────────────── */}
      <div className={styles.notice} role="note">
        Only the selected word column is imported. Meanings will be fetched from the dictionary
        after import. This is a simplified import — for full Anki deck support, export as Notes
        in Plain Text from Anki.
      </div>

      {/* ── Column cards ─────────────────────────────────────────────── */}
      <p className={styles.sectionLabel}>Select the column that contains the English words:</p>
      <div className={styles.columnGrid} role="group" aria-label="Select word column">
        {displaySuggestions.map((suggestion) => (
          <button
            key={suggestion.index}
            type="button"
            className={[
              styles.columnCard,
              selectedWord === suggestion.index ? styles.columnCardSelected : '',
            ].join(' ')}
            onClick={() => setSelectedWord(suggestion.index)}
            aria-pressed={selectedWord === suggestion.index}
          >
            <div className={styles.columnLabel}>
              Column {suggestion.index + 1}
              {suggestion.confidence > 0.6 && (
                <span className={styles.suggestedBadge}>Suggested</span>
              )}
            </div>
            <ul className={styles.sampleValues} aria-label={`Sample values for column ${suggestion.index + 1}`}>
              {suggestion.samples.map((sample, i) => (
                <li key={i} className={styles.sampleValue} title={sample}>
                  {sample.length > 30 ? sample.slice(0, 30) + '…' : sample}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* ── Optional tags column ─────────────────────────────────────── */}
      <div className={styles.tagsSection}>
        <label htmlFor="anki-tags-col" className={styles.sectionLabel}>
          Tags column (optional):
        </label>
        <select
          id="anki-tags-col"
          className={styles.tagsSelect}
          value={selectedTags ?? ''}
          onChange={(e) => setSelectedTags(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">None</option>
          {displaySuggestions
            .filter((s) => s.index !== selectedWord)
            .map((s) => (
              <option key={s.index} value={s.index}>
                Column {s.index + 1} — {s.samples[0] ?? ''}
              </option>
            ))}
        </select>
        <p className={styles.tagsHint}>
          Anki tags are space-separated. Each tag will be normalised to lowercase.
        </p>
      </div>

      {/* ── Confirm button ────────────────────────────────────────────── */}
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.confirmBtn}
          onClick={handleConfirm}
        >
          Use this column
        </button>
      </div>
    </div>
  )
}
