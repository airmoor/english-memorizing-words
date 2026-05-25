import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useImportPreviewMutation } from '../model/useImportPreviewMutation'
import { ImportSettings } from './ImportSettings'
import { Spinner } from '../../../shared/ui/Spinner'
import type {
  ParsedRow,
  ImportPreviewRow,
  ImportSettings as ImportSettingsType,
} from '../../../entities/import-session/model/types'
import styles from './ImportPreview.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeServerStatus(
  clientRows: ParsedRow[],
  serverRows: ImportPreviewRow[],
): ParsedRow[] {
  const serverMap = new Map(serverRows.map((r) => [r.word, r]))
  return clientRows.map((row) => {
    if (row.status !== 'valid') return row
    const server = serverMap.get(row.word)
    if (server && server.status !== 'valid') {
      return { ...row, status: server.status, reason: server.reason }
    }
    return row
  })
}

function countByStatus(rows: ParsedRow[]) {
  let valid = 0, duplicates = 0, errors = 0
  for (const r of rows) {
    if (r.status === 'valid') valid++
    else if (r.status === 'duplicate_vocabulary' || r.status === 'duplicate_within_batch') duplicates++
    else errors++
  }
  return { valid, duplicates, errors }
}

// ── Metadata chips ────────────────────────────────────────────────────────────

function MetaChips({ row }: { row: ParsedRow }) {
  const hasBoard = Boolean(row.board)
  const hasTags = row.tags && row.tags.length > 0
  if (!hasBoard && !hasTags) return null

  return (
    <span className={styles.metaChips}>
      {hasBoard && (
        <span className={styles.boardChip} title={`Board: ${row.board}`}>
          {row.board}
        </span>
      )}
      {hasTags && row.tags!.map((tag) => (
        <span key={tag} className={styles.tagChip}>
          {tag}
        </span>
      ))}
    </span>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, reason }: { status: ParsedRow['status']; reason?: string }) {
  const label =
    status === 'valid'
      ? 'Ready'
      : status === 'duplicate_vocabulary'
        ? 'In vocabulary'
        : status === 'duplicate_within_batch'
          ? 'Duplicate'
          : 'Error'

  const title = reason ?? label

  return (
    <span
      className={[
        styles.badge,
        status === 'valid' ? styles.badgeValid : '',
        status === 'duplicate_vocabulary' || status === 'duplicate_within_batch'
          ? styles.badgeDuplicate
          : '',
        status === 'error' ? styles.badgeError : '',
      ].join(' ')}
      title={title}
      aria-label={`${label}${reason ? `: ${reason}` : ''}`}
    >
      {label}
    </span>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ImportPreviewProps {
  parsedRows: ParsedRow[]
  settings: ImportSettingsType
  onSettingsChange: (settings: ImportSettingsType) => void
  onExecute: (rows: ParsedRow[]) => void
  onBack: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ImportPreview({
  parsedRows,
  settings,
  onSettingsChange,
  onExecute,
  onBack,
}: ImportPreviewProps) {
  const previewMutation = useImportPreviewMutation()
  const [mergedRows, setMergedRows] = useState<ParsedRow[]>(parsedRows)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'valid' | 'duplicates' | 'errors'>('all')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Run server preview whenever rows or settings change (debounced 300ms for settings)
  const runServerPreview = useCallback(
    (rows: ParsedRow[], currentSettings: ImportSettingsType) => {
      // Only pass valid rows to the server preview — no point checking duplicates/errors
      const checkRows = rows.filter((r) => r.status === 'valid')
      if (checkRows.length === 0) {
        setMergedRows(rows)
        return
      }
      previewMutation.mutate(
        { rows: checkRows, settings: currentSettings },
        {
          onSuccess: (result) => {
            setMergedRows(mergeServerStatus(rows, result.rows))
          },
          onError: () => {
            // Server preview failed — keep client-side state
            setMergedRows(rows)
          },
        },
      )
    },
    [previewMutation],
  )

  // Initial server preview on mount
  useEffect(() => {
    runServerPreview(parsedRows, settings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-run when settings change (debounced 300ms)
  const handleSettingsChange = useCallback(
    (newSettings: ImportSettingsType) => {
      onSettingsChange(newSettings)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        runServerPreview(parsedRows, newSettings)
      }, 300)
    },
    [onSettingsChange, runServerPreview, parsedRows],
  )

  const counts = countByStatus(mergedRows)

  const filteredRows = useMemo(() => {
    switch (activeFilter) {
      case 'valid':
        return mergedRows.filter((r) => r.status === 'valid')
      case 'duplicates':
        return mergedRows.filter(
          (r) => r.status === 'duplicate_vocabulary' || r.status === 'duplicate_within_batch',
        )
      case 'errors':
        return mergedRows.filter((r) => r.status === 'error')
      default:
        return mergedRows
    }
  }, [mergedRows, activeFilter])

  // Valid rows to import (either genuinely valid, or duplicates in import-anyway mode)
  const rowsToImport = mergedRows.filter((r) => {
    if (r.status === 'valid') return true
    if (r.status === 'duplicate_vocabulary' && settings.duplicateMode === 'import-anyway') return true
    return false
  })

  const importCount = rowsToImport.length

  const handleImport = useCallback(() => {
    onExecute(rowsToImport)
  }, [onExecute, rowsToImport])

  return (
    <div className={styles.preview}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Back
        </button>
        <h2 className={styles.title}>Preview</h2>
      </div>

      {/* ── Summary bar ─────────────────────────────────────────────── */}
      <div className={styles.summary}>
        <span className={styles.summaryItem}>
          {previewMutation.isPending ? (
            <Spinner />
          ) : (
            <>
              <strong>{counts.valid}</strong> ready
            </>
          )}
        </span>
        {counts.duplicates > 0 && (
          <span className={styles.summaryItem}>
            <strong>{counts.duplicates}</strong> duplicate{counts.duplicates !== 1 ? 's' : ''}
          </span>
        )}
        {counts.errors > 0 && (
          <span className={[styles.summaryItem, styles.summaryError].join(' ')}>
            <strong>{counts.errors}</strong> error{counts.errors !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────── */}
      <div className={styles.filterTabs} role="tablist" aria-label="Filter rows">
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'valid', label: 'Valid' },
            { key: 'duplicates', label: 'Duplicates' },
            { key: 'errors', label: 'Errors' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeFilter === key}
            className={[styles.filterTab, activeFilter === key ? styles.filterTabActive : ''].join(' ')}
            onClick={() => setActiveFilter(key)}
          >
            {label}
            {key === 'duplicates' && counts.duplicates > 0 && (
              <span className={styles.tabCount}>{counts.duplicates}</span>
            )}
            {key === 'errors' && counts.errors > 0 && (
              <span className={[styles.tabCount, styles.tabCountError].join(' ')}>{counts.errors}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Settings toggle ──────────────────────────────────────────── */}
      <button
        type="button"
        className={styles.settingsToggle}
        onClick={() => setSettingsOpen((v) => !v)}
        aria-expanded={settingsOpen}
      >
        {settingsOpen ? '▾ Settings' : '▸ Settings'}
      </button>

      {settingsOpen && (
        <ImportSettings settings={settings} onChange={handleSettingsChange} />
      )}

      {/* ── Row table ────────────────────────────────────────────────── */}
      <div className={styles.tableWrapper} role="table" aria-label="Import preview">
        <div className={styles.tableHead} role="row">
          <span className={styles.colWord} role="columnheader">Word</span>
          <span className={styles.colStatus} role="columnheader">Status</span>
        </div>
        <div className={styles.tableBody}>
          {filteredRows.length === 0 && (
            <p className={styles.emptyFilter} role="status">
              {activeFilter === 'errors'
                ? 'No errors found — your list looks clean.'
                : activeFilter === 'duplicates'
                  ? 'No duplicates found.'
                  : 'No rows match this filter.'}
            </p>
          )}
          {filteredRows.map((row, i) => (
            <div
              key={`${row.word}-${i}`}
              className={styles.tableRow}
              role="row"
              aria-label={`${row.word}: ${row.status}${row.reason ? `, ${row.reason}` : ''}`}
            >
              <span className={styles.colWord} role="cell">
                <span className={styles.wordText}>{row.word}</span>
                <MetaChips row={row} />
              </span>
              <span className={styles.colStatus} role="cell">
                <StatusBadge status={row.status} reason={row.reason} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Import button ────────────────────────────────────────────── */}
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.importBtn}
          onClick={handleImport}
          disabled={importCount === 0}
          aria-label={`Import ${importCount} word${importCount !== 1 ? 's' : ''}`}
        >
          {importCount === 0 ? 'Nothing to import' : `Import ${importCount} word${importCount !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}
