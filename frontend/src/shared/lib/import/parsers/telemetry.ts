/**
 * Lightweight parser telemetry hooks.
 *
 * Emits structured debug events in development builds only.
 * No vendor SDK — zero production overhead.
 * Replace `console.debug` with your analytics sink when needed.
 */

const isDev = import.meta.env.DEV

export type ParserEventName =
  | 'parser_selected'   // which parser was chosen for this input
  | 'parse_complete'    // parse finished — includes row counts
  | 'parse_error'       // parse threw an unexpected error

export interface ParserEventData {
  parser?: string
  score?: number
  rowsParsed?: number
  duplicates?: number
  warnings?: number
  error?: string
  filename?: string
}

/**
 * Emit a telemetry event.
 * In development: writes to console.debug with an [import] prefix.
 * In production: no-op (tree-shaken by bundler when isDev is statically false).
 */
export function emitParserEvent(event: ParserEventName, data: ParserEventData): void {
  if (isDev) {
    console.debug('[import]', event, data)
  }
}
