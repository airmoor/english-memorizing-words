import { useState } from 'react'
import { Copy, RotateCcw, ChevronDown } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { useImportSessionsQuery } from '../model/useImportSessionsQuery'
import type { ImportSession, ImportSessionErrorRow } from '../../../entities/import-session/model/types'
import styles from './ImportHistory.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadge(imported: number, errors: number): { text: string; cls: string } {
  if (errors === 0)                return { text: 'Complete', cls: styles.statusBadgeComplete }
  if (errors > 0 && imported > 0) return { text: 'Partial',  cls: styles.statusBadgePartial  }
  return                                  { text: 'Failed',   cls: styles.statusBadgeFailed   }
}

// Renders a word with MW-suffix dimming: first token normal, rest dimmed/italic.
function WordCell({ word }: { word: string }) {
  const spaceIdx = word.indexOf(' ')
  if (spaceIdx === -1) return <>{word}</>
  return (
    <>
      {word.slice(0, spaceIdx)}
      <span className={styles.wordSuffix}>{word.slice(spaceIdx)}</span>
    </>
  )
}

// ── Session rows ──────────────────────────────────────────────────────────────

interface SessionRowsProps {
  session: ImportSession
  isExpanded: boolean
  onToggle: () => void
  onRetry?: (errorRows: ImportSessionErrorRow[]) => void
}

function SessionRows({ session, isExpanded, onToggle, onRetry }: SessionRowsProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const { createdAt, imported, errors, errorRows, importedWords } = session
  const storedImported = importedWords ?? []
  const hiddenImportedCount = imported - storedImported.length
  const hiddenErrorCount   = errors - errorRows.length
  const badge = getStatusBadge(imported, errors)

  const hasExpansion   = imported > 0 || errors > 0
  const hasBothSections = imported > 0 && errors > 0

  const handleCopy = async () => {
    // Copy all available words: imported first (for reference), then failed (for retry).
    const words = [...storedImported, ...errorRows.map((r) => r.word)]
    const ok = await copyToClipboard(words.join('\n'))
    if (ok) {
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  return (
    <>
      {/* ── Data row ─────────────────────────────────────────────────────────── */}
      <tr className={styles.dataRow}>

        {/* Date — mobile: stacked with status badge */}
        <td className={styles.tdDate}>
          {formatDate(createdAt)}
          <span className={`${styles.statusBadge} ${badge.cls} ${styles.mobileBadge}`}>
            {badge.text}
          </span>
        </td>

        {/* Status — hidden on mobile */}
        <td className={styles.tdColStatus}>
          <span className={`${styles.statusBadge} ${badge.cls}`}>{badge.text}</span>
        </td>

        {/* Imported — clickable toggle when imported > 0; hidden on mobile */}
        <td className={`${styles.tdNumber} ${styles.tdColImported}`}>
          {imported === 0
            ? <span className={styles.dashValue}>—</span>
            : (
              <button
                type="button"
                className={`${styles.importedToggle}${isExpanded ? ` ${styles.toggleOpen}` : ''}`}
                onClick={onToggle}
                aria-expanded={isExpanded}
                aria-label={`${imported} imported, ${isExpanded ? 'collapse' : 'expand'} details`}
              >
                {imported}
                <span className={`${styles.chevron}${isExpanded ? ` ${styles.chevronOpen}` : ''}`} aria-hidden="true">
                  <Icon icon={ChevronDown} size={12} />
                </span>
              </button>
            )
          }
        </td>

        {/* Failed — desktop: count toggle or dash; mobile: combined counts */}
        <td className={styles.tdNumber}>
          {/* Desktop */}
          <span className={styles.failedDesktopCell}>
            {errors === 0
              ? <span className={styles.dashValue}>—</span>
              : (
                <button
                  type="button"
                  className={`${styles.failedToggle}${isExpanded ? ` ${styles.toggleOpen}` : ''}`}
                  onClick={onToggle}
                  aria-expanded={isExpanded}
                  aria-label={`${errors} failed, ${isExpanded ? 'collapse' : 'expand'} details`}
                >
                  {errors}
                  <span className={`${styles.chevron}${isExpanded ? ` ${styles.chevronOpen}` : ''}`} aria-hidden="true">
                    <Icon icon={ChevronDown} size={12} />
                  </span>
                </button>
              )
            }
          </span>

          {/* Mobile — merged "N imported ▾ · N failed ▾" */}
          <span className={styles.failedMobileCell}>
            {imported > 0 && (
              <button
                type="button"
                className={`${styles.mobileImportedToggle}${isExpanded ? ` ${styles.toggleOpen}` : ''}`}
                onClick={onToggle}
                aria-expanded={isExpanded}
                aria-label={`${imported} imported, ${isExpanded ? 'collapse' : 'expand'}`}
              >
                <span className={styles.importedValue}>{imported}</span>
                {' imported'}
                <span className={`${styles.chevron}${isExpanded ? ` ${styles.chevronOpen}` : ''}`} aria-hidden="true">
                  <Icon icon={ChevronDown} size={12} />
                </span>
              </button>
            )}
            {imported > 0 && errors > 0 && (
              <span className={styles.mobileSeparator}> · </span>
            )}
            {errors > 0
              ? (
                <button
                  type="button"
                  className={`${styles.mobileFailedToggle}${isExpanded ? ` ${styles.toggleOpen}` : ''}`}
                  onClick={onToggle}
                  aria-expanded={isExpanded}
                  aria-label={`${errors} failed, ${isExpanded ? 'collapse' : 'expand'}`}
                >
                  <span className={styles.failedValue}>{errors}</span>
                  {' failed'}
                  <span className={`${styles.chevron}${isExpanded ? ` ${styles.chevronOpen}` : ''}`} aria-hidden="true">
                    <Icon icon={ChevronDown} size={12} />
                  </span>
                </button>
              )
              : imported === 0
                ? <span className={styles.dashValue}>—</span>
                : null
            }
          </span>
        </td>

        {/* Actions — Retry only; Copy lives in the expansion panel */}
        <td className={styles.tdActions}>
          <div className={styles.actionsCell}>
            {errors > 0 && onRetry && (
              <button
                type="button"
                className={styles.retryBtn}
                onClick={() => onRetry(errorRows)}
                aria-label={`Retry ${errors} failed imports`}
              >
                <Icon icon={RotateCcw} size={14} />
                <span className={styles.btnText}>Retry</span>
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* ── Expansion panel — always in DOM for sessions with data (CSS animation) */}
      {hasExpansion && (
        <tr>
          <td colSpan={5} className={styles.expansionTd}>
            <div
              className={`${styles.expansionWrap}${isExpanded ? ` ${styles.expansionWrapOpen}` : ''}`}
              aria-hidden={!isExpanded}
            >
              <div className={styles.expansionPanel}>

                {/* Panel header: counts + Copy */}
                <div className={styles.panelHeader}>
                  <div className={styles.panelCounts}>
                    {imported > 0 && (
                      <span className={styles.panelImportedCount}>
                        Imported ({imported})
                      </span>
                    )}
                    {hasBothSections && (
                      <span className={styles.panelDot} aria-hidden="true">·</span>
                    )}
                    {errors > 0 && (
                      <span className={styles.panelFailedCount}>
                        Failed ({errors})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => void handleCopy()}
                    aria-label={copyState === 'copied' ? 'Copied to clipboard' : 'Copy words to clipboard'}
                  >
                    <Icon icon={Copy} size={14} />
                    <span>{copyState === 'copied' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Panel body */}
                <div className={styles.panelBody}>

                  {/* Imported section */}
                  {imported > 0 && (
                    <div className={styles.panelSection}>
                      {hasBothSections && (
                        <div className={styles.sectionTitle}>Imported</div>
                      )}
                      {storedImported.length > 0 ? (
                        <>
                          <div className={styles.importedChips}>
                            {storedImported.map((word) => (
                              <span key={word} className={styles.importedChip}>
                                <WordCell word={word} />
                              </span>
                            ))}
                          </div>
                          {hiddenImportedCount > 0 && (
                            <p className={styles.truncatedNote}>
                              …and {hiddenImportedCount} more
                            </p>
                          )}
                        </>
                      ) : (
                        <p className={styles.emptySection}>No imported words stored for this session</p>
                      )}
                    </div>
                  )}

                  {/* Divider between sections */}
                  {hasBothSections && (
                    <div className={styles.sectionDivider} role="separator" />
                  )}

                  {/* Failed section */}
                  {errors > 0 && (
                    <div className={styles.panelSection}>
                      {hasBothSections && (
                        <div className={styles.sectionTitle}>Failed</div>
                      )}
                      {errorRows.length > 0 ? (
                        <>
                          <div className={styles.failedGrid}>
                            {errorRows.map((row, i) => (
                              <div key={row.clientRowId ?? i} className={styles.failedGridRow}>
                                <span className={styles.failedWordCell}>
                                  <WordCell word={row.word} />
                                </span>
                                <span className={styles.failedReasonCell}>{row.reason}</span>
                              </div>
                            ))}
                          </div>
                          {hiddenErrorCount > 0 && (
                            <p className={styles.truncatedNote}>
                              …and {hiddenErrorCount} more
                            </p>
                          )}
                        </>
                      ) : (
                        <p className={styles.emptySection}>No failed words stored</p>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface ImportHistoryProps {
  onRetry?: (words: string[]) => void
}

export function ImportHistory({ onRetry }: ImportHistoryProps) {
  const { data: sessions, isLoading, isError } = useImportSessionsQuery()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleRetry = onRetry
    ? (errorRows: ImportSessionErrorRow[]) => onRetry(errorRows.map((r) => r.word))
    : undefined

  const toggleExpanded = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

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

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <colgroup>
          <col style={{ width: '180px' }} />
          <col className={styles.colStatus} style={{ width: '100px' }} />
          <col className={styles.colImported} style={{ width: '90px' }} />
          <col style={{ width: '90px' }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th className={styles.th} scope="col">Date</th>
            <th className={`${styles.th} ${styles.thColStatus}`} scope="col">Status</th>
            <th className={`${styles.th} ${styles.thRight} ${styles.thColImported}`} scope="col">Imported</th>
            <th className={`${styles.th} ${styles.thRight} ${styles.thColFailed}`} scope="col">Failed</th>
            <th className={`${styles.th} ${styles.thRight}`} scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {!sessions || sessions.length === 0 ? (
            <tr>
              <td colSpan={5} className={styles.emptyRow}>No imports yet</td>
            </tr>
          ) : (
            sessions.map((session) => (
              <SessionRows
                key={session.id}
                session={session}
                isExpanded={expandedId === session.id}
                onToggle={() => toggleExpanded(session.id)}
                onRetry={handleRetry}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
