import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchVocabularyPage } from '../../vocabulary/api/vocabularyApi'

/**
 * Curated pool of "try these words" suggestions for the Search idle state.
 * Kept as a static list (not a dynamic vocabulary source) — these are
 * hand-picked to sit at roughly the same register as each other. What's
 * *dynamic* is which ones surface: already-saved words are excluded and a
 * fresh subset is chosen each time this hook resolves.
 */
const SUGGESTION_POOL = [
  'ephemeral', 'serendipity', 'ambiguous', 'resilient', 'eloquent',
  'ubiquitous', 'meticulous', 'candid', 'pragmatic', 'ambivalent',
  'tenacious', 'lucid', 'austere', 'benevolent', 'cryptic',
  'diligent', 'exuberant', 'frivolous', 'gregarious', 'hapless',
  'impeccable', 'juxtapose', 'laconic', 'mundane', 'nostalgic',
  'obsolete', 'paradox', 'quaint', 'resolute', 'succinct',
  'tangible', 'vivid', 'whimsical',
] as const

const SUGGESTION_COUNT = 5

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

/**
 * Returns a random subset of the suggestion pool, excluding words the user
 * has already saved. Recomputed only when the saved-word set actually
 * changes (not on every render) so the chips don't visibly reshuffle while
 * the idle state stays on screen.
 *
 * `enabled` lets the caller skip the vocabulary fetch entirely when the
 * idle state isn't showing (e.g. mid-search).
 */
export function useWordSuggestions(enabled: boolean) {
  const { data } = useQuery({
    queryKey: ['vocabulary', 'suggestion-pool'],
    queryFn: () => fetchVocabularyPage({ limit: 200, sort: 'newest' }),
    staleTime: 60_000,
    enabled,
  })

  const savedWords = useMemo(
    () => new Set((data?.items ?? []).map((w) => w.wordText.toLowerCase())),
    [data],
  )

  return useMemo(() => {
    const available = SUGGESTION_POOL.filter((w) => !savedWords.has(w))
    return pickRandom(available, SUGGESTION_COUNT)
  }, [savedWords])
}
