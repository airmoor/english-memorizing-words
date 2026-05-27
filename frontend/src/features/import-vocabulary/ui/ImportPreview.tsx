import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Pencil, Check, X } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { useImportPreviewMutation } from '../model/useImportPreviewMutation'
import { ImportSettings } from './ImportSettings'
import { ApiError } from '../../../shared/api/base'
import { buildRowErrorMap } from '../lib/formatValidationErrors'
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

// ── Word text — dims MW-style suffixes ("able adj. a2" → "able" + " adj. a2") ─

function WordText({ word, isEdited }: { word: string; isEdited: boolean }) {
  const spaceIdx = word.indexOf(' ')
  const cls = [styles.wordText, isEdited ? styles.wordTextEdited : ''].join(' ')
  if (spaceIdx === -1) {
    return <span className={cls}>{word}</span>
  }
  const first = word.slice(0, spaceIdx)
  const rest  = word.slice(spaceIdx) // leading space kept for natural separation
  return (
    <span className={cls}>
      {first}
      <span className={styles.wordSuffix}>{rest}</span>
    </span>
  )
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
  /**
   * Server-validated rows from a previous visit to this step.
   * When provided, the summary bar renders instantly with accurate counts
   * instead of client-side placeholders, eliminating the spinner flash.
   * Omitted on the first visit; populated by `onMergedRowsChange` thereafter.
   */
  initialMergedRows?: ParsedRow[]
  /**
   * Called whenever the server-validated row state updates so the parent
   * flow can persist it for re-entry without a flicker.
   */
  onMergedRowsChange?: (rows: ParsedRow[]) => void
  settings: ImportSettingsType
  onSettingsChange: (settings: ImportSettingsType) => void
  onExecute: (rows: ParsedRow[]) => void
  onBack: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ImportPreview({
  parsedRows,
  initialMergedRows,
  onMergedRowsChange,
  settings,
  onSettingsChange,
  onExecute,
  onBack,
}: ImportPreviewProps) {
  const previewMutation = useImportPreviewMutation()
  // Prefer initialMergedRows (server-validated from a previous visit) so the
  // summary renders with accurate counts immediately. Falls back to parsedRows
  // (client-side statuses) on the very first visit to this step.
  const [mergedRows, setMergedRows] = useState<ParsedRow[]>(
    () => initialMergedRows ?? parsedRows,
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'valid' | 'duplicates' | 'errors'>('all')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Inline editing state ──────────────────────────────────────────────────
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editValue,    setEditValue]    = useState('')
  // Track rows that have been manually edited so we can show an italic marker.
  const [editedRowIds, setEditedRowIds] = useState<Set<string>>(new Set())

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
          onError: (err) => {
            // On HTTP 400 with structured validation errors: mark the affected
            // rows as 'error' so the user can see which words are invalid
            // (e.g. too long) directly in the preview table.
            if (err instanceof ApiError && err.status === 400 && err.validationErrors?.length) {
              const errorMap = buildRowErrorMap(err.validationErrors, checkRows)
              const updated = rows.map((row) => {
                const reason = errorMap.get(row.clientRowId)
                return reason ? { ...row, status: 'error' as const, reason } : row
              })
              setMergedRows(updated)
            } else {
              // Other failures (network, 5xx) — keep client-side state silently
              setMergedRows(rows)
            }
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

  // Persist the latest server-validated rows back to the parent flow.
  // This lets the summary bar render with accurate counts immediately on
  // re-entry (e.g. user views Import History mid-flow and navigates back)
  // instead of resetting to client-side placeholders and showing a spinner.
  useEffect(() => {
    if (mergedRows.length > 0) onMergedRowsChange?.(mergedRows)
    // onMergedRowsChange is a stable useCallback from the parent — omitting it
    // from the dependency array is intentional to avoid a spurious initial call
    // before the first server validation has a chance to run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedRows])

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

  // Memoized so badge counts don't re-derive on every render triggered by
  // parent state changes unrelated to the row list.
  const counts = useMemo(() => countByStatus(mergedRows), [mergedRows])

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

  // ── Inline edit handlers ──────────────────────────────────────────────────

  function handleStartEdit(clientRowId: string, word: string) {
    setEditingRowId(clientRowId)
    setEditValue(word)
  }

  function handleCancelEdit() {
    setEditingRowId(null)
    setEditValue('')
  }

  function handleConfirmEdit() {
    if (!editingRowId) return
    const trimmed = editValue.trim()
    const row = mergedRows.find((r) => r.clientRowId === editingRowId)
    if (!trimmed || !row || trimmed === row.word) {
      handleCancelEdit()
      return
    }
    setMergedRows((prev) =>
      prev.map((r) =>
        r.clientRowId === editingRowId
          ? {
              ...r,
              word: trimmed,
              // Reset to 'valid' (Ready) after manual edit.
              // The server preview re-validates on the next settings change.
              /* TODO: re-validate against vocabulary */
              status: 'valid' as const,
              reason: undefined,
            }
          : r,
      ),
    )
    setEditedRowIds((prev) => new Set(prev).add(editingRowId))
    setEditingRowId(null)
    setEditValue('')
  }

  function handleDeleteRow(clientRowId: string) {
    setMergedRows((prev) => prev.filter((r) => r.clientRowId !== clientRowId))
    if (editingRowId === clientRowId) {
      setEditingRowId(null)
      setEditValue('')
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirmEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

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
      {/*
       * Counts always render — never swapped for a spinner.
       *
       * The Spinner (28×28, margin: 2rem auto) is designed for full-page
       * loading and inflates the bar height when used inline, causing the
       * layout shift the user experiences.
       *
       * Instead: show the best available counts immediately.
       *   • On re-entry: initialMergedRows → accurate server-validated counts
       *   • First visit: parsedRows (client-side) → counts may update slightly
       *     when server responds, but a quiet number change is imperceptibly
       *     smoother than a full spinner/text swap.
       */}
      <div className={styles.summary}>
        <span className={[styles.summaryItem, styles.summaryMuted].join(' ')}>
          <strong>{counts.valid}</strong> ready
        </span>
        {counts.duplicates > 0 && (
          <span className={[styles.summaryItem, styles.summaryWarning].join(' ')}>
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
            { key: 'all', label: 'All', count: mergedRows.length },
            { key: 'valid', label: 'Valid', count: counts.valid },
            { key: 'duplicates', label: 'Duplicates', count: counts.duplicates },
            { key: 'errors', label: 'Errors', count: counts.errors },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeFilter === key}
            className={[styles.filterTab, activeFilter === key ? styles.filterTabActive : ''].join(' ')}
            onClick={() => setActiveFilter(key)}
          >
            {label}
            <span
              className={[
                styles.tabCount,
                key === 'errors' ? styles.tabCountError : '',
                key === 'duplicates' && count > 0 ? styles.tabCountWarning : '',
              ].join(' ')}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Settings toggle ──────────────────────────────────────────── */}
      <button
        type="button"
        className={styles.settingsToggle}
        onClick={() => setSettingsOpen((v) => !v)}
        aria-expanded={settingsOpen}
        aria-controls="import-settings-panel"
      >
        <Icon
          icon={ChevronDown}
          size={12}
          className={[styles.settingsChevron, settingsOpen ? styles.settingsChevronOpen : ''].join(' ')}
        />
        Import settings
      </button>

      {settingsOpen && (
        <div id="import-settings-panel" className={styles.settingsPanel}>
          <ImportSettings settings={settings} onChange={handleSettingsChange} />
        </div>
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
          {filteredRows.map((row) => {
            const isEditing = editingRowId === row.clientRowId
            const isEdited  = editedRowIds.has(row.clientRowId)
            return (
              <div
                key={row.clientRowId}
                className={[styles.tableRow, isEditing ? styles.tableRowEditing : ''].join(' ')}
                role="row"
                aria-label={
                  isEditing
                    ? `Editing word "${row.word}"`
                    : `${row.word}: ${row.status}${row.reason ? `, ${row.reason}` : ''}`
                }
              >
                <span className={styles.colWord} role="cell">
                  {isEditing ? (
                    /* ── Edit mode ─────────────────────────────────── */
                    <div className={styles.editCell}>
                      <div className={styles.editInputRow}>
                        <input
                          autoFocus
                          className={styles.editInput}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          aria-label={`Edit word "${row.word}"`}
                        />
                        <button
                          type="button"
                          className={styles.confirmBtn}
                          onClick={handleConfirmEdit}
                          aria-label="Confirm edit"
                        >
                          <Icon icon={Check} size={16} />
                        </button>
                        <button
                          type="button"
                          className={styles.cancelBtn}
                          onClick={handleCancelEdit}
                          aria-label="Cancel edit"
                        >
                          <Icon icon={X} size={16} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className={styles.deleteRowBtn}
                        onClick={() => handleDeleteRow(row.clientRowId)}
                      >
                        Remove from list
                      </button>
                    </div>
                  ) : (
                    /* ── Normal mode ───────────────────────────────── */
                    <>
                      <WordText word={row.word} isEdited={isEdited} />
                      <MetaChips row={row} />
                    </>
                  )}
                </span>

                {/* Edit trigger — sits between word column and status column */}
                {!isEditing && (
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => handleStartEdit(row.clientRowId, row.word)}
                    aria-label={`Edit word "${row.word}"`}
                  >
                    <Icon icon={Pencil} size={14} />
                  </button>
                )}

                <span className={styles.colStatus} role="cell">
                  {!isEditing && (
                    <>
                      <StatusBadge status={row.status} reason={row.reason} />
                      {row.status === 'duplicate_vocabulary' && (
                        <Link
                          to={`/vocabulary?q=${encodeURIComponent(row.word)}`}
                          className={styles.viewLink}
                          aria-label={`View "${row.word}" in vocabulary`}
                        >
                          View →
                        </Link>
                      )}
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Import button / empty state ──────────────────────────────── */}
      <div className={styles.footer}>
        {importCount === 0 && !previewMutation.isPending ? (
          <div className={styles.emptyImport}>
            <p className={styles.emptyImportMsg}>
              {counts.duplicates > 0 && counts.valid === 0
                ? `All ${counts.duplicates} word${counts.duplicates !== 1 ? 's are' : ' is'} already in your vocabulary.`
                : 'Nothing to import.'}
            </p>
            <div className={styles.emptyImportActions}>
              <Link to="/vocabulary" className={styles.emptyImportLink}>
                Go to vocabulary →
              </Link>
              <button type="button" className={styles.emptyImportBack} onClick={onBack}>
                Clear list
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={styles.importBtn}
            onClick={handleImport}
            disabled={importCount === 0}
            aria-label={`Import ${importCount} word${importCount !== 1 ? 's' : ''}`}
          >
            {`Import ${importCount} word${importCount !== 1 ? 's' : ''}`}
          </button>
        )}
      </div>
    </div>
  )
}
