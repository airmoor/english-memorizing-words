import { useState, useCallback } from 'react'
import type { ParsedRow, ImportPreviewRow, ImportExecuteResult, ImportFlowError } from '../../../entities/import-session/model/types'

// ── Step enum ─────────────────────────────────────────────────────────────────

export type ImportStep =
  | 'upload'     // Initial step: paste or upload file
  | 'parsing'    // Transient: client-side parsing in progress
  | 'anki-map'   // Column mapping step for Anki-format files (Phase 5)
  | 'preview'    // Show parsed rows + server duplicate check
  | 'importing'  // Execute request in-flight
  | 'complete'   // Import finished — show result summary
  | 'error'      // Unrecoverable error (network failure etc.)

// ── Flow state ────────────────────────────────────────────────────────────────

interface ImportFlowState {
  step: ImportStep
  parsedRows: ParsedRow[]
  /**
   * Server-merged rows from the most recent successful preview validation.
   * Preserved in the flow so that if the Preview step unmounts and remounts
   * (e.g. user switches to Import History and back) the summary bar can render
   * with already-accurate counts instead of client-side placeholders.
   *
   * Reset to [] whenever `parsedRows` changes so stale results are never used
   * with a different word list.
   */
  mergedRows: ParsedRow[]
  serverPreviewRows: ImportPreviewRow[]
  result: ImportExecuteResult | null
  error: ImportFlowError | null
  /**
   * Source format determined at parse time — used to tag the ImportSession record.
   * Set when the parser finishes; defaults to 'paste' if not explicitly set.
   */
  sourceType: 'paste' | 'csv' | 'anki'
}

const INITIAL_STATE: ImportFlowState = {
  step: 'upload',
  parsedRows: [],
  mergedRows: [],
  serverPreviewRows: [],
  result: null,
  error: null,
  sourceType: 'paste',
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useImportFlow() {
  const [state, setState] = useState<ImportFlowState>(INITIAL_STATE)

  const goTo = useCallback((step: ImportStep) => {
    setState((prev) => ({ ...prev, step }))
  }, [])

  const setParsedRows = useCallback((rows: ParsedRow[]) => {
    // Also clear mergedRows so the previous server-validated state is never
    // used as initial data for a different word list.
    setState((prev) => ({ ...prev, parsedRows: rows, mergedRows: [] }))
  }, [])

  const setMergedRows = useCallback((rows: ParsedRow[]) => {
    setState((prev) => ({ ...prev, mergedRows: rows }))
  }, [])

  const setServerPreviewRows = useCallback((rows: ImportPreviewRow[]) => {
    setState((prev) => ({ ...prev, serverPreviewRows: rows }))
  }, [])

  const setResult = useCallback((result: ImportExecuteResult) => {
    setState((prev) => ({ ...prev, result }))
  }, [])

  const setError = useCallback((error: ImportFlowError) => {
    setState((prev) => ({ ...prev, error }))
  }, [])

  const setSourceType = useCallback((sourceType: 'paste' | 'csv' | 'anki') => {
    setState((prev) => ({ ...prev, sourceType }))
  }, [])

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return {
    step: state.step,
    parsedRows: state.parsedRows,
    mergedRows: state.mergedRows,
    serverPreviewRows: state.serverPreviewRows,
    result: state.result,
    error: state.error,
    sourceType: state.sourceType,
    goTo,
    setParsedRows,
    setMergedRows,
    setServerPreviewRows,
    setResult,
    setError,
    setSourceType,
    reset,
  }
}
