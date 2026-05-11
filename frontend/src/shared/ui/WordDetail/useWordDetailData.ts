import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
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

/**
 * Resolves the word payload and learning state using a three-path strategy.
 *
 * Path 1 — Vocabulary cache (['vocabulary'])  — instant, most common in Phase 1
 * Path 2 — Search cache (['word', wordText])  — instant when present (Phase 5+)
 * Path 3 — API fetch                          — async, only when both caches miss
 *
 * ─── Rules of Hooks compliance ────────────────────────────────────────────
 * ALL hooks (useQueryClient, useQuery) are called unconditionally at the top
 * of this function on every render. There are no conditional hook calls.
 *
 * The three-path logic below the hooks is pure JS. `enabled` on useQuery
 * uses synchronous cache reads (queryClient.getQueryData is NOT a hook) to
 * suppress the network request when a cache path will succeed — avoiding
 * background fetches on every vocabulary row open.
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

  // Synchronous cache reads — these are NOT hooks. Safe to call before useQuery.
  // Used to determine whether a network fetch is actually needed.
  const vocabCachePeek = queryClient.getQueryData<VocabularyWord[]>(['vocabulary'])
  const hasVocabHit = !!(vocabCachePeek?.find((v) => v.wordId === activeWordId))
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

  // Re-read vocab cache (same reference as the peek above; no extra round-trip)
  const vocabCache = vocabCachePeek

  // Path 1: vocabulary cache — full WordPayload + LearningState, zero network
  const vocabEntry = vocabCache?.find((v) => v.wordId === activeWordId) ?? null
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
    const vocabEntryByText =
      vocabCache?.find((v) => v.wordText.toLowerCase() === normalizedText) ?? null
    return {
      word: wordResultToWordPayload(searchCacheEntry),
      learningState: vocabEntryByText ? vocabWordToLearningState(vocabEntryByText) : null,
      isLoading: false,
      error: null,
    }
  }

  // Path 3: result of the API fetch fired above
  if (fetchedWord) {
    const vocabEntryByText =
      vocabCache?.find((v) => v.wordText.toLowerCase() === (normalizedText ?? '')) ?? null
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
