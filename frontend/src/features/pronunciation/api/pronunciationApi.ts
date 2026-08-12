import { ApiError, apiClient } from '../../../shared/api/base'

export type PronunciationAccent = 'us' | 'uk' | 'au'

export interface WordPronunciation {
  wordId: string
  accent: PronunciationAccent
  audioUrl: string
  provider: string
  voice: string | null
  /**
   * Credit line that MUST be rendered whenever this recording is played —
   * Merriam-Webster's free tier and Wiktionary's CC BY-SA both require it.
   * Null for sources with no attribution requirement (Polly).
   */
  attribution: string | null
  /** Origin of the recording; used as the href behind the credit line. */
  sourceRefUrl: string | null
}

/**
 * Fetches a word's pronunciation audio URL for `accent`. The backend is
 * DB-cached and only reaches for an external source on a miss (Merriam-Webster
 * → Free Dictionary → Polly), so this is safe to call lazily on first play.
 *
 * Returns null when no audio exists for the word (HTTP 404) — a normal,
 * non-error outcome. Other failures (provider unavailable → 503) throw.
 */
export const fetchPronunciation = async (
  wordId: string,
  accent: PronunciationAccent,
): Promise<WordPronunciation | null> => {
  try {
    return await apiClient.get<WordPronunciation>(
      `/words/${wordId}/pronunciation?accent=${accent}`,
    )
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
