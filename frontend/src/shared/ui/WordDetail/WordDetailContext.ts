import { createContext, useContext } from 'react'
import type { WordDetailStateActions } from './useWordDetailState'

// ── Public facade surface ──────────────────────────────────────────────────
// The context value exposes only what feature components need.
// They never import useWordDetailState, useWordDetailData, or the containers.

export interface WordDetailContextValue {
  isOpen: boolean
  activeWordId: string | null
  /** Open the detail panel for a word by ID, with the current source list for navigation. */
  open: (wordId: string, sourceList: string[]) => void
  close: () => void
  navigateNext: () => void
  navigatePrev: () => void
}

export const WordDetailContext = createContext<WordDetailContextValue | null>(null)

/**
 * Public hook facade — the only hook that feature components import.
 *
 * Throws if called outside a WordDetailProvider. This is intentional:
 * a missing provider is a programming error and should fail loudly.
 */
export function useWordDetail(): WordDetailContextValue {
  const ctx = useContext(WordDetailContext)
  if (!ctx) {
    throw new Error('useWordDetail must be used inside a <WordDetailProvider>')
  }
  return ctx
}

// Re-export the state actions type so WordDetailProvider can satisfy it
export type { WordDetailStateActions }
