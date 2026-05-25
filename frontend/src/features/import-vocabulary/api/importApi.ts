import { apiClient } from '../../../shared/api/base'
import type { ImportPreviewResult, ImportExecuteResult, ImportSettings } from '../../../entities/import-session/model/types'
import type { ParsedRow } from '../../../entities/import-session/model/types'

// ── Request payload shapes ────────────────────────────────────────────────────

interface ImportRowPayload {
  word: string
  tags?: string[]
  board?: string
  notes?: string
}

interface ImportRequestPayload {
  words: ImportRowPayload[]
  settings: {
    boardId?: string
    tagIds?: string[]
    duplicateMode: 'skip' | 'import-anyway'
  }
}

// ── Payload builder ───────────────────────────────────────────────────────────

function buildPayload(rows: ParsedRow[], settings: ImportSettings): ImportRequestPayload {
  return {
    words: rows.map((row) => ({
      word: row.word,
      ...(row.tags && row.tags.length > 0 ? { tags: row.tags } : {}),
      ...(row.board ? { board: row.board } : {}),
      ...(row.notes ? { notes: row.notes } : {}),
    })),
    settings: {
      ...(settings.boardId ? { boardId: settings.boardId } : {}),
      ...(settings.tagIds && settings.tagIds.length > 0 ? { tagIds: settings.tagIds } : {}),
      duplicateMode: settings.duplicateMode,
    },
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * POST /import/preview
 * Returns per-row validation results without writing any data.
 * No dictionary calls — only vocabulary duplicate check.
 */
export function postImportPreview(
  rows: ParsedRow[],
  settings: ImportSettings,
): Promise<ImportPreviewResult> {
  return apiClient.post<ImportPreviewResult>('/import/preview', buildPayload(rows, settings))
}

/**
 * POST /import/execute
 * Enriches words and creates cards. Returns ImportExecuteResult with ImportStatus.
 */
export function postImportExecute(
  rows: ParsedRow[],
  settings: ImportSettings,
): Promise<ImportExecuteResult> {
  return apiClient.post<ImportExecuteResult>('/import/execute', buildPayload(rows, settings))
}
