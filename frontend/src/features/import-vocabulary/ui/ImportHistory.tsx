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

// ── Shared expansion panel ────────────────────────────────────────────────────
// Renders the expandable imported-words + failed-words section.
// Used by both the desktop table rows and the mobile cards so the content
// and layout stay in sync across breakpoints.

interface ExpansionPanelProps {
  session: ImportSession
  isExpanded: boolean
  copyState: 'idle' | 'copied'
  onCopy: () => void
}

function SessionExpansionPanel({ session, isExpanded, copyState, onCopy }: ExpansionPanelProps) {
  const { imported, errors, errorRows, importedWords } = session
  const storedImported      = importedWords ?? []
  const hiddenImportedCount = imported - storedImported.length
  const hiddenErrorCount    = errors - errorRows.length
  const hasBothSections     = imported > 0 && errors > 0

  return (
    <div
      className={`${styles.expansionWrap}${isExpanded ? ` ${styles.expansionWrapOpen}` : ''}`}
      aria-hidden={!isExpanded}
    >
      <div className={styles.expansionPanel}>

        {/* Panel header: counts + Copy button */}
        <div className={styles.panelHeader}>
          <div className={styles.panelCounts}>
            {imported > 0 && (
              <span className={styles.panelImportedCount}>Imported ({imported})</span>
            )}
            {hasBothSections && (
              <span className={styles.panelDot} aria-hidden="true">·</span>
            )}
            {errors > 0 && (
              <span className={styles.panelFailedCount}>Failed ({errors})</span>
            )}
          </div>
          <button
            type="button"
            className={styles.copyBtn}
            onClick={onCopy}
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
              {hasBothSections && <div className={styles.sectionTitle}>Imported</div>}
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
                    <p className={styles.truncatedNote}>…and {hiddenImportedCount} more</p>
                  )}
                </>
              ) : (
                <p className={styles.emptySection}>No imported words stored for this session</p>
              )}
            </div>
          )}

          {hasBothSections && <div className={styles.sectionDivider} role="separator" />}

          {/* Failed section */}
          {errors > 0 && (
            <div className={styles.panelSection}>
              {hasBothSections && <div className={styles.sectionTitle}>Failed</div>}
              {errorRows.length > 0 ? (
                <>
                  <div className={styles.failedGrid}>
                    {errorRows.map((row, i) => (
                      <div key={row.clientRowId ?? i} className={styles.failedGridRow}>
                        <span className={styles.failedWordCell}><WordCell word={row.word} /></span>
                        <span className={styles.failedReasonCell}>{row.reason}</span>
                      </div>
                    ))}
                  </div>
                  {hiddenErrorCount > 0 && (
                    <p className={styles.truncatedNote}>…and {hiddenErrorCount} more</p>
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
  )
}

// ── Desktop table rows ────────────────────────────────────────────────────────

interface SessionRowsProps {
  session: ImportSession
  isExpanded: boolean
  onToggle: () => void
  onRetry?: (errorRows: ImportSessionErrorRow[]) => void
}

function SessionRows({ session, isExpanded, onToggle, onRetry }: SessionRowsProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const { createdAt, imported, errors, errorRows } = session
  const badge        = getStatusBadge(imported, errors)
  const hasExpansion = imported > 0 || errors > 0

  const handleCopy = async () => {
    const storedImported = session.importedWords ?? []
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
            <SessionExpansionPanel
              session={session}
              isExpanded={isExpanded}
              copyState={copyState}
              onCopy={() => void handleCopy()}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Mobile card ───────────────────────────────────────────────────────────────
// Shown instead of the table on small screens (≤639 px).
// Shares SessionExpansionPanel for the details section.

function MobileSessionCard({ session, isExpanded, onToggle, onRetry }: SessionRowsProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const { createdAt, imported, errors, errorRows } = session
  const badge        = getStatusBadge(imported, errors)
  const hasExpansion = imported > 0 || errors > 0

  const handleCopy = async () => {
    const storedImported = session.importedWords ?? []
    const words = [...storedImported, ...errorRows.map((r) => r.word)]
    const ok = await copyToClipboard(words.join('\n'))
    if (ok) {
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  // Build accessible label for the expand trigger
  const statsLabel = [
    imported > 0 ? `${imported} imported` : '',
    errors   > 0 ? `${errors} failed`     : '',
  ].filter(Boolean).join(', ')

  return (
    <div className={styles.mobileCard}>

      {/* ── Header: date (left) + status badge (right) ───────────────────── */}
      <div className={styles.mobileCardHeader}>
        <span className={styles.mobileCardDate}>{formatDate(createdAt)}</span>
        <span className={`${styles.statusBadge} ${badge.cls}`}>{badge.text}</span>
      </div>

      {/* ── Meta row: stats expand-trigger (left) + retry button (right) ─── */}
      <div className={styles.mobileCardMeta}>
        {hasExpansion ? (
          <button
            type="button"
            className={`${styles.mobileExpandBtn}${isExpanded ? ` ${styles.mobileExpandBtnOpen}` : ''}`}
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-label={`${statsLabel}, ${isExpanded ? 'collapse' : 'expand'} details`}
          >
            {imported > 0 && (
              <span className={styles.mobileStatImported}>{imported} imported</span>
            )}
            {imported > 0 && errors > 0 && (
              <span className={styles.mobileStatSep} aria-hidden="true"> · </span>
            )}
            {errors > 0 && (
              <span className={styles.mobileStatFailed}>{errors} failed</span>
            )}
            <span
              className={`${styles.chevron}${isExpanded ? ` ${styles.chevronOpen}` : ''}`}
              aria-hidden="true"
            >
              <Icon icon={ChevronDown} size={13} />
            </span>
          </button>
        ) : (
          <span className={styles.dashValue}>—</span>
        )}

        {errors > 0 && onRetry && (
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => onRetry(errorRows)}
            aria-label={`Retry ${errors} failed imports`}
          >
            <Icon icon={RotateCcw} size={13} />
            {/* btnText is always shown in mobile cards — the override in
                the mobile-card CSS block restores display:inline here */}
            <span className={styles.btnText}>Retry</span>
          </button>
        )}
      </div>

      {/* ── Expansion panel (same component as desktop) ───────────────────── */}
      {hasExpansion && (
        <SessionExpansionPanel
          session={session}
          isExpanded={isExpanded}
          copyState={copyState}
          onCopy={() => void handleCopy()}
        />
      )}
    </div>
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

  // ── Loading / error ───────────────────────────────────────────────────────

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

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!sessions || sessions.length === 0) {
    return (
      <div className={styles.centered}>
        <p className={styles.emptyTitle}>No imports yet</p>
        <p className={styles.emptyBody}>Your import history will appear here.</p>
      </div>
    )
  }

  // ── Both layouts — CSS controls which is visible ──────────────────────────
  //
  // .mobileList  is display:none on desktop; flex column on mobile (≤639 px)
  // .tableWrap   is visible on desktop;      display:none on mobile (≤639 px)
  //
  // They share the same expandedId state so opening a row in one layout
  // and resizing the window keeps the same row expanded in the other.

  return (
    <>
      {/* ── Mobile card list ─────────────────────────────────────────────── */}
      <div className={styles.mobileList} aria-label="Import history">
        {sessions.map((session) => (
          <MobileSessionCard
            key={session.id}
            session={session}
            isExpanded={expandedId === session.id}
            onToggle={() => toggleExpanded(session.id)}
            onRetry={handleRetry}
          />
        ))}
      </div>

      {/* ── Desktop / tablet table ────────────────────────────────────────── */}
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
            {sessions.map((session) => (
              <SessionRows
                key={session.id}
                session={session}
                isExpanded={expandedId === session.id}
                onToggle={() => toggleExpanded(session.id)}
                onRetry={handleRetry}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
