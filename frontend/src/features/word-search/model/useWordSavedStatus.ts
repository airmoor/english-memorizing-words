import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchWordSavedStatus } from '../api/wordApi'

/**
 * Fetches and caches the saved status for a single word.
 *
 * Each word gets its own cache entry under ['saved-status', wordId], so
 * navigating between words never invalidates unrelated status entries.
 *
 * `optimisticSaved` is a local override used by WordEntry to flip the
 * "Saved ✓" badge to true immediately when the user confirms a save,
 * before the cache refetch completes. Callers set it via `setOptimistic`;
 * it reverts to null (deferring back to real cache data) on settlement.
 */
export function useWordSavedStatus(wordId: string) {
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null)

  const { data } = useQuery({
    queryKey: ['saved-status', wordId] as const,
    queryFn:  () => fetchWordSavedStatus(wordId),
    staleTime: 5 * 60_000, // 5 min — matches the word lookup staleTime
  })

  return {
    /** True when the word is saved (server data or optimistic override). */
    isSaved:        optimisticSaved ?? data?.isSaved ?? false,
    /** Meaning IDs currently saved for this word. Empty = all meanings / not yet loaded. */
    savedMeaningIds: data?.meaningIds ?? [],
    /** The saved word's card id — null when not saved / not yet loaded. */
    cardId:          data?.cardId ?? null,
    /** Boards the word's card currently belongs to. */
    boards:          data?.boards ?? [],
    /**
     * Set to `true` for instant optimistic feedback; `null` to revert to
     * server data (call after mutation settles).
     */
    setOptimistic:  setOptimisticSaved,
  }
}
