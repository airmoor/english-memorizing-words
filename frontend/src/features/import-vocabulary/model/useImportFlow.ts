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
  serverPreviewRows: ImportPreviewRow[]
  result: ImportExecuteResult | null
  error: ImportFlowError | null
}

const INITIAL_STATE: ImportFlowState = {
  step: 'upload',
  parsedRows: [],
  serverPreviewRows: [],
  result: null,
  error: null,
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useImportFlow() {
  const [state, setState] = useState<ImportFlowState>(INITIAL_STATE)

  const goTo = useCallback((step: ImportStep) => {
    setState((prev) => ({ ...prev, step }))
  }, [])

  const setParsedRows = useCallback((rows: ParsedRow[]) => {
    setState((prev) => ({ ...prev, parsedRows: rows }))
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

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return {
    step: state.step,
    parsedRows: state.parsedRows,
    serverPreviewRows: state.serverPreviewRows,
    result: state.result,
    error: state.error,
    goTo,
    setParsedRows,
    setServerPreviewRows,
    setResult,
    setError,
    reset,
  }
}
