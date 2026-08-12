import { useQuery } from '@tanstack/react-query'
import {
  fetchPronunciation,
  type PronunciationAccent,
} from '../api/pronunciationApi'

/**
 * Lazily fetches a word's pronunciation audio for `accent`.
 *
 * `enabled` gates the request so nothing is fetched until the user first hits
 * play. Cached forever per (word, accent) — the audio URL is immutable once
 * produced, and the backend persists the file anyway.
 */
export function usePronunciation(
  wordId: string,
  accent: PronunciationAccent,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['pronunciation', wordId, accent],
    queryFn: () => fetchPronunciation(wordId, accent),
    enabled: enabled && !!wordId,
    staleTime: Infinity,
    retry: false,
  })
}
