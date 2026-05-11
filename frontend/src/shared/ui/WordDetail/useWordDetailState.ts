import { useReducer, useCallback } from 'react'

// ── State shape ────────────────────────────────────────────────────────────

export interface WordDetailState {
  isOpen: boolean
  /** The word ID currently shown in the detail panel. Null when closed. */
  activeWordId: string | null
  /**
   * Word IDs in the current filtered/sorted order at the time the panel opened.
   * Captured on open; updated if the source list changes while the panel is open.
   * Used for ‹ › and keyboard navigation between words.
   */
  sourceList: string[]
  /**
   * Current position in sourceList. -1 when activeWordId is not in the list.
   * Never stored redundantly with activeWordId — always derived from
   * sourceList.indexOf(activeWordId). Kept in state to avoid O(n) on every render.
   */
  activeIndex: number
}

// ── Actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: 'OPEN'; wordId: string; sourceList: string[] }
  | { type: 'CLOSE' }
  | { type: 'NAVIGATE_TO'; index: number }
  | { type: 'UPDATE_SOURCE_LIST'; sourceList: string[] }

// ── Reducer ────────────────────────────────────────────────────────────────

function reducer(state: WordDetailState, action: Action): WordDetailState {
  switch (action.type) {
    case 'OPEN': {
      const index = action.sourceList.indexOf(action.wordId)
      return {
        isOpen: true,
        activeWordId: action.wordId,
        sourceList: action.sourceList,
        activeIndex: index,
      }
    }

    case 'CLOSE':
      return {
        isOpen: false,
        activeWordId: null,
        sourceList: state.sourceList, // preserve — used for re-open UX
        activeIndex: -1,
      }

    case 'NAVIGATE_TO': {
      const { index } = action
      if (index < 0 || index >= state.sourceList.length) return state
      return {
        ...state,
        activeWordId: state.sourceList[index],
        activeIndex: index,
      }
    }

    case 'UPDATE_SOURCE_LIST': {
      // The filter changed while the panel was open — update the list,
      // recalculate activeIndex. If activeWordId is no longer in the new
      // list, keep it visible but activeIndex becomes -1 (no navigation arrows).
      const newIndex = action.sourceList.indexOf(state.activeWordId ?? '')
      return {
        ...state,
        sourceList: action.sourceList,
        activeIndex: newIndex,
      }
    }

    default:
      return state
  }
}

const INITIAL_STATE: WordDetailState = {
  isOpen: false,
  activeWordId: null,
  sourceList: [],
  activeIndex: -1,
}

// ── Hook ───────────────────────────────────────────────────────────────────

export interface WordDetailStateActions {
  open: (wordId: string, sourceList: string[]) => void
  close: () => void
  navigateTo: (index: number) => void
  navigateNext: () => void
  navigatePrev: () => void
  updateSourceList: (sourceList: string[]) => void
}

/**
 * Pure UI state for the word detail panel. No side effects, no API calls,
 * no React Query — just open/close/navigate state.
 *
 * This is the bottom layer of the useWordDetail stack:
 *   useWordDetailState  ← here (pure state)
 *   useWordDetailData   (data resolution)
 *   useWordDetailKeyboard (keyboard bindings)
 *   useWordDetail       (public facade)
 *
 * Independently testable with renderHook + no mocks.
 */
export function useWordDetailState(): [WordDetailState, WordDetailStateActions] {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const open = useCallback((wordId: string, sourceList: string[]) => {
    dispatch({ type: 'OPEN', wordId, sourceList })
  }, [])

  const close = useCallback(() => {
    dispatch({ type: 'CLOSE' })
  }, [])

  const navigateTo = useCallback((index: number) => {
    dispatch({ type: 'NAVIGATE_TO', index })
  }, [])

  const navigateNext = useCallback(() => {
    dispatch({ type: 'NAVIGATE_TO', index: (state.activeIndex ?? 0) + 1 })
  }, [state.activeIndex])

  const navigatePrev = useCallback(() => {
    dispatch({ type: 'NAVIGATE_TO', index: (state.activeIndex ?? 0) - 1 })
  }, [state.activeIndex])

  const updateSourceList = useCallback((sourceList: string[]) => {
    dispatch({ type: 'UPDATE_SOURCE_LIST', sourceList })
  }, [])

  return [
    state,
    { open, close, navigateTo, navigateNext, navigatePrev, updateSourceList },
  ]
}
