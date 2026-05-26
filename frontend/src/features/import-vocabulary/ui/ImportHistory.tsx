import { useState } from 'react'
import { useImportSessionsQuery } from '../model/useImportSessionsQuery'
import type { ImportSession, ImportSessionErrorRow } from '../../../entities/import-session/model/types'
import styles from './ImportHistory.module.css'

// ── Clipboard helper ──────────────────────────────────────────────────────────

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusDotClass(status: ImportSession['status']): string {
  switch (status) {
    case 'completed':       return styles.dotCompleted
    case 'partial_failure': return styles.dotPartial
    case 'no_changes':      return styles.dotNoChanges
    case 'failed':          return styles.dotFailed
  }
}

function sourceLabel(sourceType: ImportSession['sourceType']): string {
  switch (sourceType) {
    case 'paste': return 'paste'
    case 'csv':   return 'csv'
    case 'anki':  return 'anki'
  }
}

// ── Session row ───────────────────────────────────────────────────────────────

interface SessionRowProps {
  session: ImportSession
  /** Called when the user clicks "Retry failed rows" */
  onRetry?: (errorRows: ImportSessionErrorRow[]) => void
}

function SessionRow({ session, onRetry }: SessionRowProps) {
  const [showErrors, setShowErrors] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const {
    status, sourceType, createdAt,
    imported, skipped, duplicatesIgnored, errors,
    errorRows,
  } = session

  // True when the backend capped stored error rows (total errors > stored rows).
  // The `errors` field is always the accurate total; `errorRows` is the stored subset.
  const hiddenErrorCount = errors - errorRows.length

  const handleCopy = async () => {
    const words = errorRows.map((r) => r.word).join('\n')
    const ok = await copyToClipboard(words)
    if (ok) {
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  return (
    <div className={styles.sessionItem}>
      <div className={styles.sessionHeader}>
        <span className={[styles.dot, statusDotClass(status)].join(' ')} aria-hidden="true" />
        <span className={styles.sessionDate}>{formatDate(createdAt)}</span>
        <span className={styles.sessionSource}>{sourceLabel(sourceType)}</span>
      </div>

      <div className={styles.sessionCounts}>
        {imported > 0 && (
          <span className={styles.countImported}>
            {imported} imported
          </span>
        )}
        {skipped > 0 && <span>{skipped} skipped</span>}
        {duplicatesIgnored > 0 && <span>{duplicatesIgnored} duplicates</span>}
        {errors > 0 && (
          <span className={styles.countErrors}>
            {errors} failed
          </span>
        )}
      </div>

      {/* Retry section — only shown when there are failed rows */}
      {errors > 0 && (
        <div className={styles.retrySection}>
          {/* Expand/collapse stored error rows */}
          {errorRows.length > 0 && (
            <button
              type="button"
              className={styles.retryToggle}
              onClick={() => setShowErrors((v) => !v)}
              aria-expanded={showErrors}
            >
              {showErrors
                ? 'Hide failed rows'
                : `Show ${errorRows.length} failed row${errorRows.length !== 1 ? 's' : ''}`}
            </button>
          )}

          {showErrors && (
            <div className={styles.errorRows} role="list">
              {errorRows.map((row, i) => (
                <div key={row.clientRowId ?? i} className={styles.errorRow} role="listitem">
                  <span className={styles.errorRowWord}>{row.word}</span>
                  <span className={styles.errorRowReason}>{row.reason}</span>
                </div>
              ))}
              {/* Indicate when stored rows are fewer than the actual error count */}
              {hiddenErrorCount > 0 && (
                <p className={styles.moreErrors}>
                  …and {hiddenErrorCount} more failed row{hiddenErrorCount !== 1 ? 's' : ''} (not stored)
                </p>
              )}
            </div>
          )}

          <div className={styles.retryActions}>
            {/* Copy failed words to clipboard for manual re-paste */}
            {errorRows.length > 0 && (
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => void handleCopy()}
                aria-label="Copy failed words to clipboard"
              >
                <CopyIcon />
                {copyState === 'copied' ? 'Copied!' : 'Copy words'}
              </button>
            )}

            {/* Retry: switch to Import tab with failed words pre-filled */}
            {onRetry && errorRows.length > 0 && (
              <button
                type="button"
                className={styles.retryBtn}
                onClick={() => onRetry(errorRows)}
                aria-label={`Retry ${errorRows.length} failed rows from this import`}
              >
                <RetryIcon />
                Retry failed rows
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface ImportHistoryProps {
  /** Called when the user wants to retry failed rows — receives the error rows as a word list. */
  onRetry?: (words: string[]) => void
}

export function ImportHistory({ onRetry }: ImportHistoryProps) {
  const { data: sessions, isLoading, isError } = useImportSessionsQuery()

  const handleRetry = onRetry
    ? (errorRows: ImportSessionErrorRow[]) => {
        onRetry(errorRows.map((r) => r.word))
      }
    : undefined

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <p className={styles.emptyBody}>Loading import history…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={styles.centered}>
        <p className={styles.emptyTitle}>Could not load history</p>
        <p className={styles.emptyBody}>Please try again later.</p>
      </div>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className={styles.centered}>
        <span className={styles.emptyIcon} aria-hidden="true">📋</span>
        <p className={styles.emptyTitle}>No imports yet</p>
        <p className={styles.emptyBody}>
          Each import you run will appear here so you can review results and retry failed words.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.history} role="list" aria-label="Import history">
      {sessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          onRetry={handleRetry}
        />
      ))}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function RetryIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
    </svg>
  )
}
