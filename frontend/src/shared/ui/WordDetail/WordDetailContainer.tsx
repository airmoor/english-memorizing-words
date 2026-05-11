import { useMemo, useId, useState, useEffect, type ReactNode } from 'react'
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
 * Uses window.matchMedia change listeners so the variant updates immediately
 * on viewport resize — no page reload required.
 */
function useContainerVariant(): 'bottomSheet' | 'sidePanel' {
  const [variant, setVariant] = useState<'bottomSheet' | 'sidePanel'>(() => {
    if (typeof window === 'undefined') return 'bottomSheet'
    const isCoarse = window.matchMedia('(pointer: coarse)').matches
    const isNarrow = window.matchMedia('(max-width: 1023px)').matches
    return isCoarse || isNarrow ? 'bottomSheet' : 'sidePanel'
  })

  useEffect(() => {
    const coarseQuery = window.matchMedia('(pointer: coarse)')
    const narrowQuery = window.matchMedia('(max-width: 1023px)')

    const update = () => {
      setVariant(
        coarseQuery.matches || narrowQuery.matches ? 'bottomSheet' : 'sidePanel',
      )
    }

    coarseQuery.addEventListener('change', update)
    narrowQuery.addEventListener('change', update)
    return () => {
      coarseQuery.removeEventListener('change', update)
      narrowQuery.removeEventListener('change', update)
    }
  }, [])

  return variant
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
  /**
   * The context in which the panel is used.
   * - 'vocabulary': replaces DictionaryHeader save/remove with a close × button.
   * - 'search': standard save/remove actions in DictionaryHeader.
   */
  context?: 'vocabulary' | 'search'
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
export function WordDetailContainer({ children, onSave, onRemove, context = 'vocabulary' }: Props) {
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

  // ── onClose for vocabulary context ────────────────────────────────────────
  // In vocabulary context the DictionaryHeader shows a close × button instead
  // of the "Saved ✓" badge. Pass actions.close so clicking it closes the panel.
  const headerOnClose = context === 'vocabulary' ? actions.close : undefined

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
      onClose={headerOnClose}
    />
  ) : null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <WordDetailContext.Provider value={contextValue}>
      {variant === 'sidePanel' ? (
        // Desktop: CSS grid split-view. Grid class applied only while panel is open
        // so the list takes full width when closed (no wasted whitespace).
        // The grid stays active through the SidePanel exit animation because
        // state.isOpen remains true until after the animation timer fires.
        <div className={state.isOpen ? styles.pageWithPanel : undefined}>
          <div className={state.isOpen ? styles.listColumn : undefined}>
            {children}
          </div>
          <SidePanel
            isOpen={state.isOpen}
            onClose={actions.close}
            contentKey={state.activeWordId}
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
