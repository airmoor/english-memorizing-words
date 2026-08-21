import { apiClient } from '../../../shared/api/base'
import type {
  ImportPreviewResult,
  ImportExecuteResult,
  ImportSettings,
  ImportSession,
  ImportSessionList,
} from '../../../entities/import-session/model/types'
import type { ParsedRow } from '../../../entities/import-session/model/types'

// ── Request payload shapes ────────────────────────────────────────────────────

interface ImportRowPayload {
  word: string
  tags?: string[]
  board?: string
  notes?: string
  /** Stable client-generated UUID; echoed in preview and execute error rows. */
  clientRowId?: string
  /**
   * 1-based source line number from the parser.
   * Echoed in preview rows and execute error rows for frontend row highlighting.
   * Accurate for CSV, Anki, and multi-header files (not reconstructed server-side).
   */
  lineNumber?: number
  /**
   * Parser-determined status for this row.
   * Sent so the backend can preserve 'duplicate_within_batch' without re-computing it,
   * keeping the parser as the single source of truth for within-batch deduplication.
   */
  parserStatus?: 'valid' | 'duplicate_within_batch' | 'error'
  /**
   * Parser-generated reason string.
   * Sent alongside parserStatus so the backend can echo the exact reason
   * (e.g. "Already in this list (line 3)") without reconstructing it.
   */
  parserReason?: string
}

interface ImportRequestPayload {
  words: ImportRowPayload[]
  settings: {
    boardId?: string
    tagIds?: string[]
    duplicateMode: 'skip' | 'import-anyway'
  }
  /** Source format — used to tag the ImportSession for history. */
  sourceType?: 'paste' | 'csv' | 'anki'
}

// ── Payload builder ───────────────────────────────────────────────────────────

/**
 * Ownership invariants enforced by this builder:
 *
 *   parser    → owns within-batch duplicate detection
 *               parserStatus / parserReason are sent as-is for all non-vocabulary statuses
 *   backend   → owns duplicate_vocabulary detection (vocabulary lookup, server-side only)
 *               rows with status 'duplicate_vocabulary' are sent as parserStatus 'valid'
 *               so the backend re-evaluates them against the live vocabulary
 *   clientRowId → identity only; never interpreted as a key or ordering hint
 *   lineNumber  → display / debug only; never used for deduplication or ordering
 *   array ordering must never be relied upon for row correlation — use clientRowId
 */
function buildPayload(
  rows: ParsedRow[],
  settings: ImportSettings,
  sourceType?: 'paste' | 'csv' | 'anki',
): ImportRequestPayload {
  return {
    ...(sourceType ? { sourceType } : {}),
    words: rows.map((row) => ({
      word: row.word,
      ...(row.tags && row.tags.length > 0 ? { tags: row.tags } : {}),
      ...(row.board ? { board: row.board } : {}),
      ...(row.notes ? { notes: row.notes } : {}),
      // Identity fields — echoed in preview rows and execute error rows
      clientRowId: row.clientRowId,
      lineNumber: row.lineNumber,
      // Ownership fields — parser's determination, preserved by backend
      parserStatus: row.status === 'duplicate_vocabulary' ? 'valid' : row.status,
      ...(row.reason ? { parserReason: row.reason } : {}),
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
 *
 * @param signal Optional AbortSignal — cancels the in-flight request.
 */
export function postImportPreview(
  rows: ParsedRow[],
  settings: ImportSettings,
  signal?: AbortSignal,
): Promise<ImportPreviewResult> {
  return apiClient.post<ImportPreviewResult>('/import/preview', buildPayload(rows, settings), signal)
}

/**
 * POST /import/execute
 * Enriches words and creates cards. Returns ImportExecuteResult with ImportStatus.
 *
 * @param signal Optional AbortSignal — cancels the in-flight request.
 */
export function postImportExecute(
  rows: ParsedRow[],
  settings: ImportSettings,
  sourceType?: 'paste' | 'csv' | 'anki',
  signal?: AbortSignal,
): Promise<ImportExecuteResult> {
  return apiClient.post<ImportExecuteResult>('/import/execute', buildPayload(rows, settings, sourceType), signal)
}

// ── Session history ───────────────────────────────────────────────────────────

/**
 * GET /import/sessions?limit=N
 * Returns the current user's import history, newest first.
 *
 * apiClient resolves an empty 2xx body to `null` (see shared/api/base.ts) —
 * coerce that to an empty session list rather than leaking null into the
 * `result.sessions` destructure at the call site.
 */
export async function getImportSessions(limit = 50): Promise<ImportSessionList> {
  const result = await apiClient.get<ImportSessionList | null>(`/import/sessions?limit=${limit}`)
  return result ?? { sessions: [] }
}

/**
 * GET /import/sessions/:id
 * Returns a single import session with full error row detail.
 */
export function getImportSession(id: string): Promise<ImportSession> {
  return apiClient.get<ImportSession>(`/import/sessions/${id}`)
}
