import { useState } from 'react'
import { Copy, RotateCcw, ClipboardList } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
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
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadge(
  imported: number,
  errors: number,
): { text: string; cls: string } {
  if (errors === 0)                  return { text: 'Complete', cls: styles.statusBadgeComplete }
  if (errors > 0 && imported > 0)   return { text: 'Partial',  cls: styles.statusBadgePartial  }
  return                                    { text: 'Failed',   cls: styles.statusBadgeFailed   }
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
    createdAt,
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

  const badge = getStatusBadge(imported, errors)

  return (
    <div className={styles.sessionItem}>
      <div className={styles.sessionHeader}>
        <span className={styles.sessionDate}>{formatDate(createdAt)}</span>
        <span className={[styles.statusBadge, badge.cls].join(' ')}>{badge.text}</span>
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
                <Icon icon={Copy} size={12} />
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
                <Icon icon={RotateCcw} size={12} />
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
        <span className={styles.emptyIcon} aria-hidden="true">
          <Icon icon={ClipboardList} size={32} muted />
        </span>
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
