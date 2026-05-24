import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import type { PaginatedVocabulary, VocabularyWord } from '../../../entities/vocabulary/model/types'
import type { WordResult } from '../../../entities/word/model/types'
import { fetchWord } from '../../../features/word-search/api/wordApi'
import type { WordPayload, LearningState } from './types'
import {
  vocabWordToWordPayload,
  vocabWordToLearningState,
  wordResultToWordPayload,
} from './adapters'

// ── Result type ───────────────────────────────────────────────────────────

export interface WordDetailData {
  /** The dictionary payload. Undefined while loading (path 3 only). */
  word: WordPayload | undefined
  /** The learning state. Null when the word is not saved to vocabulary. */
  learningState: LearningState | null
  /** True only during a network fetch (path 3). Paths 1 and 2 are instant. */
  isLoading: boolean
  error: Error | null
}

// ── Cache lookup helper ───────────────────────────────────────────────────
//
// The vocabulary page uses useInfiniteQuery with key ['vocabulary', {...}].
// useSavedWords uses useQuery with key ['saved-words'] (a DIFFERENT key so
// the two shapes never collide in the cache).
//
// Reading from the cache therefore means iterating the InfiniteData pages —
// getQueryData(['vocabulary']) no longer returns anything meaningful.

/**
 * Synchronous, zero-network search across all pages of every cached
 * vocabulary infinite query.
 *
 * Uses a predicate so callers can match by wordId OR by normalised text
 * without separate helpers.
 *
 * Skips any cache entry that doesn't have a `.pages` array — this guards
 * against stale regular-query entries that could be left in the cache if
 * the query key is later inadvertently reused.
 */
function findInVocabCache(
  queryClient: ReturnType<typeof useQueryClient>,
  predicate: (v: VocabularyWord) => boolean,
): VocabularyWord | null {
  const allData = queryClient.getQueriesData<InfiniteData<PaginatedVocabulary>>({
    queryKey: ['vocabulary'],
  })
  for (const [, data] of allData) {
    // Type guard: skip cache entries that aren't InfiniteData (e.g., a
    // regular useQuery written to the same key prefix by mistake).
    if (!data || !Array.isArray(data.pages)) continue
    for (const page of data.pages) {
      const found = page.items.find(predicate)
      if (found) return found
    }
  }
  return null
}

/**
 * Resolves the word payload and learning state using a three-path strategy.
 *
 * Path 1 — Vocabulary infinite cache (['vocabulary', {...}]) — instant, most common
 * Path 2 — Search cache (['word', wordText])                 — instant when present
 * Path 3 — API fetch                                         — async, only when both miss
 *
 * ─── Rules of Hooks compliance ────────────────────────────────────────────
 * ALL hooks (useQueryClient, useQuery) are called unconditionally at the top
 * of this function on every render. There are no conditional hook calls.
 *
 * The three-path logic below the hooks is pure JS. `enabled` on useQuery
 * uses synchronous cache reads (queryClient.getQueriesData is NOT a hook)
 * to suppress the network request when a cache path will succeed.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function useWordDetailData(
  activeWordId: string | null,
  activeWordText: string | null,
): WordDetailData {

  // ── Step 1: all hooks called unconditionally ──────────────────────────────

  const queryClient = useQueryClient()

  // Normalise for cache key matching (search cache keys use lowercase, trimmed text)
  const normalizedText = activeWordText?.toLowerCase().trim() ?? null

  // Synchronous cache reads — these are NOT hooks.
  // Used to decide whether a network fetch is actually needed.
  const vocabEntry = activeWordId
    ? findInVocabCache(queryClient, (v) => v.wordId === activeWordId)
    : null
  const hasVocabHit = vocabEntry !== null

  const hasSearchHit = normalizedText
    ? !!queryClient.getQueryData<WordResult>(['word', normalizedText])
    : false

  // Path 3 query — always called (Rules of Hooks) but `enabled` suppresses
  // the network request when paths 1 or 2 will satisfy the data need.
  const {
    data: fetchedWord,
    isPending: isFetching,
    isError,
    error: fetchError,
  } = useQuery<WordResult>({
    queryKey: ['word', normalizedText ?? ''],
    queryFn: () => fetchWord(normalizedText!),
    enabled: !hasVocabHit && !hasSearchHit && normalizedText !== null && activeWordId !== null,
    retry: false,
    staleTime: 5 * 60 * 1000,
    // keepPreviousData: shows previous word's content during word-to-word navigation
    // so the panel never blanks out mid-transition (spec §6.4)
    placeholderData: keepPreviousData,
  })

  // ── Step 2: pure path resolution — no hooks below this line ──────────────

  // Path 1: vocabulary cache — full WordPayload + LearningState, zero network
  if (vocabEntry) {
    return {
      word: vocabWordToWordPayload(vocabEntry),
      learningState: vocabWordToLearningState(vocabEntry),
      isLoading: false,
      error: null,
    }
  }

  // Path 2: search cache — present when word was found via search before opening
  const searchCacheEntry = normalizedText
    ? queryClient.getQueryData<WordResult>(['word', normalizedText])
    : null

  if (searchCacheEntry) {
    // Look up learning state by text in case the user has saved this word
    const vocabEntryByText = normalizedText
      ? findInVocabCache(queryClient, (v) => v.wordText.toLowerCase() === normalizedText)
      : null
    return {
      word: wordResultToWordPayload(searchCacheEntry),
      learningState: vocabEntryByText ? vocabWordToLearningState(vocabEntryByText) : null,
      isLoading: false,
      error: null,
    }
  }

  // Path 3: result of the API fetch fired above
  if (fetchedWord) {
    const vocabEntryByText = normalizedText
      ? findInVocabCache(queryClient, (v) => v.wordText.toLowerCase() === (normalizedText ?? ''))
      : null
    return {
      word: wordResultToWordPayload(fetchedWord),
      learningState: vocabEntryByText ? vocabWordToLearningState(vocabEntryByText) : null,
      isLoading: false,
      error: null,
    }
  }

  // Path 3 still loading or errored
  return {
    word: undefined,
    learningState: null,
    isLoading: isFetching && normalizedText !== null,
    error: isError ? (fetchError as Error) : null,
  }
}
