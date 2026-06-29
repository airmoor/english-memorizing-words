import { ApiError, apiClient } from '../../../shared/api/base'

export interface WordTranslation {
  wordId: string
  languageCode: string
  text: string
  provider: string
}

/**
 * Fetches a word's translation in `lang`. The backend is DB-cached and only
 * calls the external API on a miss, so this is safe to call lazily on reveal.
 *
 * Returns null when no translation exists for the word (HTTP 404) — a normal,
 * non-error outcome. Other failures (provider/ language unavailable) throw.
 */
export const fetchTranslation = async (
  wordId: string,
  lang: string,
): Promise<WordTranslation | null> => {
  try {
    return await apiClient.get<WordTranslation>(
      `/words/${wordId}/translation?lang=${encodeURIComponent(lang)}`,
    )
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
