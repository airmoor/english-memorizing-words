import { useQuery } from '@tanstack/react-query'
import { fetchTranslation } from '../api/translationApi'

/**
 * Lazily fetches a word's translation in `lang`.
 *
 * `enabled` gates the request so nothing is fetched until the user reveals the
 * translation. Cached forever per (word, lang) — translations are immutable
 * once produced, and the backend persists them anyway.
 */
export function useTranslation(
  wordId: string,
  lang: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['translation', wordId, lang],
    queryFn: () => fetchTranslation(wordId, lang as string),
    enabled: enabled && !!wordId && !!lang,
    staleTime: Infinity,
    retry: false,
  })
}
