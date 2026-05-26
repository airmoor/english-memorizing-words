import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
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
  const isPartial = result.status === 'partial_failure'
  const isFailed = result.status === 'failed'

  const handleViewVocabulary = () => {
    navigate('/vocabulary')
    onViewVocabulary()
  }

  const handleSearchWord = (word: string) => {
    navigate(`/search?q=${encodeURIComponent(word)}`)
    onViewVocabulary()
  }

  return (
    <div className={styles.result}>
      {/* ── Status icon + heading ────────────────────────────────────── */}
      <div
        className={[
          styles.statusHeader,
          isCompleted ? styles.statusSuccess : '',
          isPartial ? styles.statusWarning : '',
          isFailed ? styles.statusDanger : '',
        ].join(' ')}
      >
        <span className={styles.statusIcon} aria-hidden="true">
          {isCompleted ? '✓' : isPartial ? '⚠' : '✕'}
        </span>
        <h2 className={styles.statusTitle}>
          {isCompleted
            ? 'Import complete'
            : isPartial
              ? 'Partially imported'
              : 'Import failed'}
        </h2>
        {isCompleted && (
          <p className={styles.statusSubtitle}>
            All words were imported successfully.
          </p>
        )}
        {isFailed && (
          <p className={styles.statusSubtitle}>
            No words could be imported. They may not be in our dictionary yet.
          </p>
        )}
      </div>

      {/* ── Counts ──────────────────────────────────────────────────── */}
      <div className={styles.counts}>
        <div className={styles.countItem}>
          <span className={styles.countValue}>{result.imported}</span>
          <span className={styles.countLabel}>Imported</span>
        </div>
        {result.skipped > 0 && (
          <div className={styles.countItem}>
            <span className={styles.countValue}>{result.skipped}</span>
            <span className={styles.countLabel}>Skipped</span>
          </div>
        )}
        {result.errors > 0 && (
          <div className={[styles.countItem, styles.countDanger].join(' ')}>
            <span className={styles.countValue}>{result.errors}</span>
            <span className={styles.countLabel}>Failed</span>
          </div>
        )}
      </div>

      {/* ── Failed words (expandable) ────────────────────────────────── */}
      {result.errorRows.length > 0 && (
        <div className={styles.errorSection}>
          <div className={styles.errorHeader}>
            <button
              type="button"
              className={styles.errorToggle}
              onClick={() => setErrorRowsExpanded((v) => !v)}
              aria-expanded={errorRowsExpanded}
            >
              <span aria-hidden="true">{errorRowsExpanded ? '▾' : '▸'}</span>
              {' '}View {result.errors} failed word{result.errors !== 1 ? 's' : ''}
            </button>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => void handleCopyFailed()}
              aria-label="Copy failed words to clipboard"
            >
              {copyState === 'copied' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          {errorRowsExpanded && (
            <ul className={styles.errorList} aria-label="Failed words">
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

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className={styles.actions}>
        {result.imported > 0 && (
          <button
            type="button"
            className={styles.primaryAction}
            onClick={handleViewVocabulary}
          >
            View vocabulary
          </button>
        )}
        <button
          type="button"
          className={styles.secondaryAction}
          onClick={onImportMore}
        >
          Import more
        </button>
      </div>
    </div>
  )
}
