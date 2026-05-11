import { useMemo, useId, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWordDetailState } from './useWordDetailState'
import { useWordDetailData } from './useWordDetailData'
import { WordDetailContext } from './WordDetailContext'
import { BottomSheet } from './BottomSheet'
import { SidePanel } from './SidePanel'
import { WordDetailContent } from './WordDetailContent'
import { Spinner } from '../Spinner'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
import styles from './WordDetailContainer.module.css'

// ── Pointer + viewport detection ──────────────────────────────────────────

/**
 * Detects whether to use BottomSheet (touch/mobile) or SidePanel (pointer/desktop).
 *
 * Strategy (spec §5.3):
 * - coarse pointer OR viewport < 1024px → BottomSheet
 * - fine pointer AND viewport ≥ 1024px  → SidePanel
 *
 * Evaluated once on mount and on window resize.
 * Uses matchMedia — SSR-safe with a sensible default.
 */
function useContainerVariant(): 'bottomSheet' | 'sidePanel' {
  // useMemo with no deps = evaluated once on mount, stable for the component lifetime
  return useMemo(() => {
    if (typeof window === 'undefined') return 'bottomSheet'
    const isCoarse = window.matchMedia('(pointer: coarse)').matches
    const isNarrow = window.innerWidth < 1024
    return isCoarse || isNarrow ? 'bottomSheet' : 'sidePanel'
  }, [])
}

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode
  /**
   * Called when the user saves the current word.
   * Provided by the page via WordDetailProvider — defaults to no-op.
   */
  onSave?: (wordId: string) => void
  /**
   * Called when the user removes the current word.
   * Provided by the page via WordDetailProvider — defaults to no-op.
   */
  onRemove?: (wordId: string) => void
}

/**
 * WordDetailContainer — the rendering bridge.
 *
 * Composes useWordDetailState + useWordDetailData + pointer detection.
 * Mounts one BottomSheet or one SidePanel per page — not per row.
 * Contains zero business logic.
 *
 * Used internally by WordDetailProvider — never imported directly by pages.
 */
export function WordDetailContainer({ children, onSave, onRemove }: Props) {
  const variant = useContainerVariant()
  const [state, actions] = useWordDetailState()
  const queryClient = useQueryClient()
  const headingId = useId()

  // Resolve the word text for useWordDetailData.
  // Priority: vocabulary cache lookup (Phase 1 only use case).
  // When the word is not in vocab cache (URL restore, search context), wordText
  // will be null until the vocab cache loads — the API fetch then uses the URL param.
  const wordText = useMemo(() => {
    if (!state.activeWordId) return null
    const vocabCache = queryClient.getQueryData<VocabularyWord[]>(['vocabulary'])
    return vocabCache?.find((v) => v.wordId === state.activeWordId)?.wordText ?? null
  }, [state.activeWordId, queryClient])

  const { word, learningState, isLoading, error } = useWordDetailData(
    state.activeWordId,
    wordText,
  )

  // ── Mutations — provided by the page via WordDetailProvider ────────────────
  const handleSave = () => {
    if (state.activeWordId) onSave?.(state.activeWordId)
  }
  const handleRemove = () => {
    if (state.activeWordId) {
      onRemove?.(state.activeWordId)
      actions.close()
    }
  }

  // ── Context value — the public facade surface ──────────────────────────────
  const contextValue = useMemo(
    () => ({
      isOpen: state.isOpen,
      activeWordId: state.activeWordId,
      open: actions.open,
      close: actions.close,
      navigateNext: actions.navigateNext,
      navigatePrev: actions.navigatePrev,
    }),
    [state.isOpen, state.activeWordId, actions],
  )

  // ── Nav state ──────────────────────────────────────────────────────────────
  const canNavigatePrev = state.activeIndex > 0
  const canNavigateNext =
    state.activeIndex >= 0 && state.activeIndex < state.sourceList.length - 1
  const navLabel =
    state.activeIndex >= 0
      ? `${state.activeIndex + 1} / ${state.sourceList.length}`
      : undefined

  // ── Content to render inside the container ────────────────────────────────
  const detailContent = isLoading ? (
    <Spinner />
  ) : error ? (
    <p style={{ color: 'var(--color-danger)', padding: 'var(--space-md)' }}>
      Could not load definition. <button onClick={() => {}}>Retry</button>
    </p>
  ) : word ? (
    <WordDetailContent
      word={word}
      learningState={learningState}
      onSave={handleSave}
      onRemove={handleRemove}
    />
  ) : null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <WordDetailContext.Provider value={contextValue}>
      {variant === 'sidePanel' ? (
        // Desktop: wrap children + panel in a flex row so panel pushes the list
        <div className={styles.pageWithPanel}>
          <div className={styles.listColumn}>
            {children}
          </div>
          <SidePanel
            isOpen={state.isOpen}
            onClose={actions.close}
            contentKey={state.activeWordId}
          >
            {/* Heading element with the ID used for aria-labelledby on BottomSheet
                and for the live region announcement on SidePanel */}
            {word && (
              <span
                id={headingId}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                aria-hidden="true"
              >
                {word.text}
              </span>
            )}
            {detailContent}
          </SidePanel>
        </div>
      ) : (
        // Mobile: children render normally; BottomSheet portals to document.body
        <>
          {children}
          <BottomSheet
            isOpen={state.isOpen}
            onClose={actions.close}
            labelId={headingId}
            canNavigatePrev={canNavigatePrev}
            canNavigateNext={canNavigateNext}
            onNavigatePrev={actions.navigatePrev}
            onNavigateNext={actions.navigateNext}
            navLabel={navLabel}
          >
            {/* Hidden heading for aria-labelledby */}
            {word && (
              <h2
                id={headingId}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                aria-hidden="true"
              >
                {word.text}
              </h2>
            )}
            {detailContent}
          </BottomSheet>
        </>
      )}
    </WordDetailContext.Provider>
  )
}
