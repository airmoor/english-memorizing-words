import { useQuery } from '@tanstack/react-query'
import { getImportSessions } from '../api/importApi'
import type { ImportSession } from '../../../entities/import-session/model/types'

export const IMPORT_SESSIONS_QUERY_KEY = ['import-sessions'] as const

/**
 * Fetches the current user's import history (newest first).
 * Data is cached for 30 seconds — stale enough to avoid hammering the API
 * when switching tabs, fresh enough for a reasonable history view.
 */
export function useImportSessionsQuery(limit = 50) {
  return useQuery<ImportSession[]>({
    queryKey: [...IMPORT_SESSIONS_QUERY_KEY, limit],
    queryFn: async () => {
      const result = await getImportSessions(limit)
      return result.sessions
    },
    staleTime: 30_000,
  })
}
