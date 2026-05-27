import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import type { ImportExecuteResult } from '../../../entities/import-session/model/types'
import styles from './ImportResult.module.css'

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

interface ImportResultProps {
  result: ImportExecuteResult
  onViewVocabulary: () => void
  onImportMore: () => void
}

export function ImportResult({ result, onViewVocabulary, onImportMore }: ImportResultProps) {
  const [errorRowsExpanded, setErrorRowsExpanded] = useState(false)
  const [copyState, setCopyState]   = useState<'idle' | 'copied'>('idle')
  const navigate = useNavigate()

  const handleCopyFailed = async () => {
    const words = result.errorRows.map((r) => r.word).join('\n')
    const ok = await copyToClipboard(words)
    if (ok) {
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  const isCompleted = result.status === 'completed'
  const isPartial   = result.status === 'partial_failure'
  const isFailed    = result.status === 'failed'

  const handleViewVocabulary = () => {
    navigate('/vocabulary')
    onViewVocabulary()
  }

  const handleSearchWord = (word: string) => {
    navigate(`/search?q=${encodeURIComponent(word)}`)
    onViewVocabulary()
  }

  // Partial success still uses the check icon — it's a success with a footnote.
  // Only all-failed uses the X icon.
  const statusIcon = isFailed ? XCircle : CheckCircle

  return (
    <div className={styles.result}>
      <div className={styles.card}>

        {/* ── Status row ──────────────────────────────────────────────── */}
        <div className={styles.statusRow}>
          <span
            className={[styles.statusIcon, isFailed ? styles.iconDanger : styles.iconSuccess].join(' ')}
            aria-hidden="true"
          >
            <Icon icon={statusIcon} size={20} />
          </span>
          <h2 className={styles.statusTitle}>
            {isCompleted
              ? 'Import complete'
              : isPartial
                ? 'Imported with some issues'
                : 'Import failed'}
          </h2>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={[styles.statValue, styles.statSuccess].join(' ')}>
              {result.imported}
            </span>
            <span className={styles.statLabel}>imported</span>
          </div>
          {result.errors > 0 && (
            <div className={styles.stat}>
              <span className={[styles.statValue, styles.statDanger].join(' ')}>
                {result.errors}
              </span>
              <span className={styles.statLabel}>failed</span>
            </div>
          )}
          {result.skipped > 0 && (
            <div className={styles.stat}>
              <span className={styles.statValue}>{result.skipped}</span>
              <span className={styles.statLabel}>skipped (duplicates)</span>
            </div>
          )}
        </div>

        {/* ── Failed words collapsible ─────────────────────────────────── */}
        {result.errorRows.length > 0 && (
          <div className={styles.errorSection}>
            <div className={styles.errorHeader}>
              <button
                type="button"
                className={styles.errorToggle}
                onClick={() => setErrorRowsExpanded((v) => !v)}
                aria-expanded={errorRowsExpanded}
                aria-controls="result-error-list"
              >
                <Icon icon={errorRowsExpanded ? ChevronDown : ChevronRight} size={13} />
                {errorRowsExpanded
                  ? 'Hide failed words'
                  : `View ${result.errors} failed word${result.errors !== 1 ? 's' : ''}`}
              </button>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => void handleCopyFailed()}
                aria-label="Copy failed words to clipboard"
              >
                {copyState === 'copied'
                  ? <><Icon icon={Check} size={12} strokeWidth={2.5} /> Copied</>
                  : 'Copy'}
              </button>
            </div>
            {errorRowsExpanded && (
              <ul
                id="result-error-list"
                className={styles.errorList}
                aria-label="Failed words"
              >
                {result.errorRows.map((row) => (
                  <li key={row.word} className={styles.errorRow}>
                    <span className={styles.errorWord}>{row.word}</span>
                    <span className={styles.errorReason}>{row.reason}</span>
                    <button
                      type="button"
                      className={styles.searchLink}
                      onClick={() => handleSearchWord(row.word)}
                      aria-label={`Search for ${row.word}`}
                    >
                      Search
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div className={styles.divider} aria-hidden="true" />

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={handleViewVocabulary}
          >
            View vocabulary
          </button>
          <button
            type="button"
            className={styles.tertiaryAction}
            onClick={onImportMore}
          >
            Import more words
          </button>
        </div>

      </div>
    </div>
  )
}
