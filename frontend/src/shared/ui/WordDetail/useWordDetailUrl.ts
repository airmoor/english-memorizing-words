/**
 * URL synchronization for the word detail panel.
 *
 * Spec §8: "URL state for the detail panel is an architectural principle
 * established from day one."
 *
 * Behavior:
 *   open detail       → pushState  ?word=ephemeral  (creates back-button entry)
 *   word-to-word nav  → replaceState ?word=new-word (no history entry per word)
 *   close panel       → replaceState (removes ?word=)
 *   page load         → if ?word= present, open detail for matching word
 *
 * URL uses word text (not ID) for human readability and shareability.
 * Case-insensitive match on restore (citext at DB level).
 */

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
import type { WordDetailContextValue } from './WordDetailContext'

const WORD_PARAM = 'word'

interface UseWordDetailUrlOptions {
  /** The current detail panel state */
  detail: Pick<WordDetailContextValue, 'isOpen' | 'activeWordId'>
  /** Full list of vocabulary items — used for text→ID resolution on restore */
  vocabularyItems: VocabularyWord[]
  /** Open function from detail context */
  open: WordDetailContextValue['open']
  /** Close function from detail context */
  close: WordDetailContextValue['close']
}

/**
 * Syncs the word detail panel state with the URL `?word=` param.
 *
 * Call this hook in a component that has access to both the detail context
 * and the vocabulary list (e.g., VocabularyPage, or a wrapper component).
 *
 * The hook is read/write:
 * - Reads: restores panel from URL on mount (once)
 * - Writes: updates URL param on open/navigate/close
 */
export function useWordDetailUrl({
  detail,
  vocabularyItems,
  open,
  close,
}: UseWordDetailUrlOptions) {
  const [searchParams, setSearchParams] = useSearchParams()
  const isRestoringFromUrl = useRef(false)
  const prevWordId = useRef<string | null>(null)
  const hasMounted = useRef(false)

  // ── Restore from URL on mount ──────────────────────────────────────────────
  // Only runs once when vocabulary items are available.
  // If ?word=ephemeral, look up the word in vocabulary cache and open the panel.
  useEffect(() => {
    if (hasMounted.current) return
    if (vocabularyItems.length === 0) return // wait for vocab to load
    hasMounted.current = true

    const wordText = searchParams.get(WORD_PARAM)
    if (!wordText) return

    const normalized = wordText.toLowerCase().trim()
    const match = vocabularyItems.find(
      (v) => v.wordText.toLowerCase() === normalized,
    )

    if (!match) {
      // Word not found in vocabulary — silently remove the stale URL param
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete(WORD_PARAM)
        return next
      }, { replace: true })
      return
    }

    // Found — open the panel without triggering another URL write
    isRestoringFromUrl.current = true
    const sourceList = vocabularyItems.map((v) => v.wordId)
    open(match.wordId, sourceList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabularyItems.length]) // Re-run when vocabulary finishes loading

  // ── Write URL on panel state change ──────────────────────────────────────
  useEffect(() => {
    // Skip the write triggered by URL restoration (we're restoring, not navigating)
    if (isRestoringFromUrl.current) {
      isRestoringFromUrl.current = false
      prevWordId.current = detail.activeWordId
      return
    }

    const currentWordText = detail.activeWordId
      ? vocabularyItems.find((v) => v.wordId === detail.activeWordId)?.wordText ?? null
      : null

    if (!detail.isOpen || !currentWordText) {
      // Panel closed — remove the ?word= param (replaceState, no history entry)
      if (prevWordId.current !== null) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete(WORD_PARAM)
          return next
        }, { replace: true })
      }
      prevWordId.current = null
      return
    }

    const isFirstOpen = prevWordId.current === null
    const isWordChange = prevWordId.current !== detail.activeWordId

    if (!isFirstOpen && !isWordChange) return // no change

    prevWordId.current = detail.activeWordId

    if (isFirstOpen) {
      // Initial open → pushState (creates back-button entry per §8.3)
      setSearchParams({ [WORD_PARAM]: currentWordText }, { replace: false })
    } else {
      // Word-to-word navigation → replaceState (no history entry per §8.3)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set(WORD_PARAM, currentWordText)
        return next
      }, { replace: true })
    }
  }, [detail.isOpen, detail.activeWordId, vocabularyItems, setSearchParams])
}
