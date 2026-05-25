/**
 * ImportStatus communicates the lifecycle state of an import.
 *
 * 'queued' and 'processing' are reserved for a future async job mode
 * and are NOT returned by the synchronous MVP execute endpoint.
 */
export type ImportStatus =
  | 'queued'           // reserved: job received, enrichment not yet started
  | 'processing'       // reserved: enrichment in progress
  | 'completed'        // all submitted words successfully imported
  | 'partial_failure'  // some imported, some failed enrichment or validation
  | 'failed';          // nothing imported (all duplicates, all failed, or network error)
