// ── ImportStatus ──────────────────────────────────────────────────────────────

/**
 * Overall outcome of an import execution.
 * 'queued' and 'processing' are reserved for a future async job mode.
 */
export type ImportStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'partial_failure'
  | 'failed'

// ── ParsedRow — client-side representation ────────────────────────────────────

export type ImportRowStatus =
  | 'valid'
  | 'duplicate_vocabulary'
  | 'duplicate_within_batch'
  | 'error'

/** A row produced by a parser — fully typed before server preview call. */
export interface ParsedRow {
  word: string
  lineNumber: number
  rawText: string
  status: ImportRowStatus
  reason?: string
  /** Row-level tags (from CSV column or Anki mapping) */
  tags?: string[]
  /** Row-level board name (from CSV column) */
  board?: string
  /** Row-level note (from CSV column) */
  notes?: string
}

// ── ImportSettings — client-side settings state ───────────────────────────────

export interface ImportSettings {
  boardId?: string
  tagIds?: string[]
  duplicateMode: 'skip' | 'import-anyway'
}

// ── API request/response shapes ───────────────────────────────────────────────

export interface ImportPreviewRow {
  word: string
  status: 'valid' | 'duplicate_vocabulary' | 'duplicate_within_batch' | 'error'
  reason?: string
}

export interface ImportPreviewResult {
  rows: ImportPreviewRow[]
}

export interface ImportErrorRow {
  word: string
  reason: string
}

export interface ImportExecuteResult {
  status: ImportStatus
  imported: number
  skipped: number
  errors: number
  errorRows: ImportErrorRow[]
}
