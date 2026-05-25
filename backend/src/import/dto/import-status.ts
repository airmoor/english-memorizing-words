/**
 * ImportStatus communicates the lifecycle state of an import.
 *
 * Sync MVP returns one of: completed | partial_failure | no_changes | failed.
 * 'queued' and 'processing' are reserved for a future async job mode where the
 * backend queues enrichment work and the client polls for status updates.
 *
 * ┌─────────────────────┬──────────────────────────────────────────────────┐
 * │ Status              │ Condition                                        │
 * ├─────────────────────┼──────────────────────────────────────────────────┤
 * │ completed           │ imported > 0 && errors === 0                     │
 * │ partial_failure     │ imported > 0 && errors > 0                       │
 * │ no_changes          │ imported === 0 && errors === 0 (all skipped/dup) │
 * │ failed              │ imported === 0 && errors > 0                     │
 * │ queued    (future)  │ job received, enrichment not yet started         │
 * │ processing (future) │ enrichment in progress                           │
 * └─────────────────────┴──────────────────────────────────────────────────┘
 */
export type ImportStatus =
  | 'queued'           // reserved: future async mode
  | 'processing'       // reserved: future async mode
  | 'completed'        // all submitted words successfully imported
  | 'partial_failure'  // some imported, some failed enrichment
  | 'no_changes'       // succeeded technically — but nothing was imported (all duplicates / all skipped)
  | 'failed';          // nothing imported due to errors (not duplicates)
