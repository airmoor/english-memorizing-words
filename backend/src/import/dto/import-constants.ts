/**
 * Single source of truth for import status string values.
 *
 * Every place that needs these strings — Swagger enums, class-validator @IsIn(),
 * TypeScript type derivation — imports from here so additions or renames are
 * made in one place and propagate automatically.
 */

// ── Row statuses (preview + execute responses) ────────────────────────────────

export const IMPORT_ROW_STATUSES = [
  'valid',
  'duplicate_vocabulary',
  'duplicate_within_batch',
  'error',
] as const;

export type ImportRowStatus = (typeof IMPORT_ROW_STATUSES)[number];

/**
 * Subset of IMPORT_ROW_STATUSES that the parser can assign.
 * 'duplicate_vocabulary' is server-only — the parser never emits it because
 * vocabulary lookup happens server-side after parsing is complete.
 */
export const PARSER_ROW_STATUSES = [
  'valid',
  'duplicate_within_batch',
  'error',
] as const;

export type ParserRowStatus = (typeof PARSER_ROW_STATUSES)[number];

// ── Import lifecycle statuses ─────────────────────────────────────────────────

export const IMPORT_STATUSES = [
  'queued',          // reserved: future async mode
  'processing',      // reserved: future async mode
  'completed',       // imported > 0 && errors === 0
  'partial_failure', // imported > 0 && errors > 0
  'no_changes',      // imported === 0 && errors === 0 (all skipped / all duplicates)
  'failed',          // imported === 0 && errors > 0
] as const;

export type ImportStatus = (typeof IMPORT_STATUSES)[number];

/**
 * Statuses returned by the synchronous execute endpoint.
 * 'queued' and 'processing' are excluded — they are reserved for a future
 * async job mode and will never appear in sync responses.
 */
export const SYNC_IMPORT_STATUSES = [
  'completed',
  'partial_failure',
  'no_changes',
  'failed',
] as const;
