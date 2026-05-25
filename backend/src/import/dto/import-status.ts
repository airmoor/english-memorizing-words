/**
 * Re-exports ImportStatus from import-constants.ts for backward compatibility.
 *
 * Callers that already import from './dto/import-status' continue to work.
 * New code should prefer importing directly from './dto/import-constants'.
 *
 * ┌─────────────────────┬──────────────────────────────────────────────────┐
 * │ Status              │ Condition                                        │
 * ├─────────────────────┼──────────────────────────────────────────────────┤
 * │ completed           │ imported > 0 && errors === 0                     │
 * │ partial_failure     │ imported > 0 && errors > 0                       │
 * │ no_changes          │ imported === 0 && errors === 0 (skipped/dup)     │
 * │ failed              │ imported === 0 && errors > 0                     │
 * │ queued    (future)  │ job received, enrichment not yet started         │
 * │ processing (future) │ enrichment in progress                           │
 * └─────────────────────┴──────────────────────────────────────────────────┘
 */
export type { ImportStatus } from './import-constants';
