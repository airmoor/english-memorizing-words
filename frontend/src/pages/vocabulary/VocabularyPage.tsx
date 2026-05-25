import { useCallback, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Text } from '../../shared/ui/Typography/Typography'
import { Container } from '../../shared/ui/layout/Container'
import { PageLayout } from '../../shared/ui/layout/PageLayout'
import { WordDetailProvider } from '../../shared/ui/WordDetail/WordDetailProvider'
import { useWordDetail } from '../../shared/ui/WordDetail/WordDetailContext'
import { useWordDetailUrl } from '../../shared/ui/WordDetail/useWordDetailUrl'
import { VocabularyList } from '../../features/vocabulary/ui/VocabularyList'
import { VocabularyToolbar } from '../../features/vocabulary/ui/VocabularyToolbar'
import { VocabularyFilterBar } from '../../features/vocabulary/ui/VocabularyFilterBar'
import { BoardReviewBanner } from '../../features/vocabulary/ui/BoardReviewBanner'
import { VocabularyBoardsSidebar } from '../../features/boards/ui/VocabularyBoardsSidebar'
import { MobileBoardsSelector } from '../../features/boards/ui/MobileBoardsSelector'
import { useVocabularyInfinite } from '../../features/vocabulary/model/useVocabularyInfinite'
import { useVocabularyFilters } from '../../features/vocabulary/model/useVocabularyFilters'
import { useBoardsQuery } from '../../features/boards/model/useBoardsQuery'
import { featureFlags } from '../../shared/lib/featureFlags'
import type { VocabularyFilter, SortOption } from '../../features/vocabulary/model/cardState'
import type { ViewMode } from '../../features/vocabulary/ui/VocabularyToolbar'
import type { VocabularyWord } from '../../entities/vocabulary/model/types'
import styles from './VocabularyPage.module.css'

// ── Skeleton loading placeholders ─────────────────────────────────────────────

function ToolbarSkeleton() {
  return (
    <div className={styles.skeletonToolbar} aria-hidden="true">
      <div className={styles.skeletonTopRow}>
        <div className={styles.skeletonSearch} />
        <div className={styles.skeletonControl} style={{ width: 94 }} />
        <div className={styles.skeletonControl} style={{ width: 74 }} />
      </div>
      <div className={styles.skeletonChipRow}>
        <div className={styles.skeletonChip} style={{ width: 48 }} />
        <div className={styles.skeletonChip} style={{ width: 44 }} />
        <div className={styles.skeletonChip} style={{ width: 76 }} />
        <div className={styles.skeletonDivider} />
        <div className={styles.skeletonChip} style={{ width: 80 }} />
        <div className={styles.skeletonChip} style={{ width: 66 }} />
        <div className={styles.skeletonChip} style={{ width: 56 }} />
      </div>
    </div>
  )
}

const SKELETON_CARDS: [number, number[]][] = [
  [130, [1, 0.82]],
  [96,  [1]],
  [158, [1, 0.74, 0.58]],
  [112, [1, 0.88]],
  [80,  [1, 0.65]],
]

function ListSkeleton() {
  return (
    <div className={styles.skeletonList} aria-hidden="true">
      {SKELETON_CARDS.map(([wordWidth, defs], i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonCardBody}>
            <div className={styles.skeletonWord} style={{ width: wordWidth }} />
            {defs.map((pct, j) => (
              <div
                key={j}
                className={styles.skeletonDef}
                style={{ width: `${Math.round(pct * 100)}%` }}
              />
            ))}
          </div>
          <div className={styles.skeletonTrash} />
        </div>
      ))}
    </div>
  )
}

// ── View mode persistence ─────────────────────────────────────────────────────

function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem('vocab-view')
      return stored === 'compact' ? 'compact' : 'detailed'
    } catch {
      return 'detailed'
    }
  })

  const set = useCallback((m: ViewMode) => {
    setMode(m)
    try { localStorage.setItem('vocab-view', m) } catch { /* ignore */ }
  }, [])

  return [mode, set]
}

// ── Inner component — inside WordDetailProvider ───────────────────────────────

interface ContentProps {
  items: VocabularyWord[]
  onRemove: (wordId: string) => void
  viewMode: ViewMode
  isEmpty: boolean
  hasActiveFilters?: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  onClearFilters?: () => void
}

function VocabularyPageContent({
  items,
  onRemove,
  viewMode,
  isEmpty,
  hasActiveFilters,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onClearFilters,
}: ContentProps) {
  const detail = useWordDetail()

  useWordDetailUrl({
    detail,
    vocabularyItems: items,
    open:  detail.open,
    close: detail.close,
  })

  return (
    <VocabularyList
      items={items}
      onRemove={onRemove}
      viewMode={viewMode}
      isEmpty={isEmpty}
      hasActiveFilters={hasActiveFilters}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      onClearFilters={onClearFilters}
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function VocabularyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode]         = useViewMode()

  // ── URL-backed filter state ───────────────────────────────────────────────

  const activeFilters = (searchParams.get('f') ?? '').split(',').filter(Boolean) as VocabularyFilter[]
  const sort          = (searchParams.get('s') ?? 'newest') as SortOption

  // ── Search input ──────────────────────────────────────────────────────────

  const [inputValue, setInputValue]         = useState(() => searchParams.get('q') ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get('q') ?? '')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const handleQueryChange = useCallback((q: string) => {
    setInputValue(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q === '') {
      setDebouncedQuery('')
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('q')
        return next
      }, { replace: true })
      return
    }
    debounceRef.current = setTimeout(() => {
      const trimmed = q.trim()
      setDebouncedQuery(trimmed)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (trimmed) next.set('q', trimmed)
        else next.delete('q')
        return next
      }, { replace: true })
    }, 300)
  }, [setSearchParams])

  // ── Filter / sort handlers ────────────────────────────────────────────────

  const handleFilterToggle = useCallback(
    (f: VocabularyFilter) => {
      setSearchParams(
        (prev) => {
          const next    = new URLSearchParams(prev)
          const current = (prev.get('f') ?? '').split(',').filter(Boolean) as VocabularyFilter[]
          const updated = current.includes(f)
            ? current.filter((x) => x !== f)
            : [...current, f]
          if (updated.length) next.set('f', updated.join(','))
          else next.delete('f')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const handleSortChange = useCallback(
    (s: SortOption) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (s !== 'newest') next.set('s', s)
          else next.delete('s')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // ── API-level filters (tags, reviewState, POS, sortDir) ──────────────────
  // boardId is managed separately as "navigation context" — not a temporary
  // filter. It is NOT included in hasApiFilters or cleared by the filter bar.
  const {
    filters:          apiFilters,
    setFilter:        setApiFilter,
    clearFilters:     clearApiFilters,
    hasActiveFilters: hasApiFilters,
  } = useVocabularyFilters()

  // ── Board context — URL-backed ────────────────────────────────────────────
  //
  // Boards feel like navigation (workspaces), not temporary filters.
  // The active board ID lives in the URL ?board= param so it:
  //   - persists across refreshes
  //   - is linkable (home page boards section links here)
  //   - is independent of the filter bar "Clear" action
  //
  // On mount, seed from the URL if present. Thereafter, URL is the source of truth.

  const urlBoard = searchParams.get('board') ?? undefined
  const { data: boards = [] } = useBoardsQuery()
  const activeBoard = boards.find((b) => b.id === urlBoard)

  // Keep the apiFilters.boardId in sync with the URL board param
  // so the existing vocabulary query stays board-scoped.
  useEffect(() => {
    if (urlBoard !== apiFilters.boardId) {
      setApiFilter({ boardId: urlBoard })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlBoard])

  const handleBoardSelect = useCallback(
    (boardId: string | undefined) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (boardId) next.set('board', boardId)
          else next.delete('board')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // ── Non-board active filters (used by FilterBar "clear" logic) ───────────
  const hasNonBoardApiFilters = Object.keys(apiFilters).some(
    (k) => k !== 'boardId',
  )
  const hasFilterBarFilters = hasNonBoardApiFilters || activeFilters.length > 0 || debouncedQuery.length > 0

  // ── Data ──────────────────────────────────────────────────────────────────

  const {
    items,
    total,
    isLoading,
    isError,
    isFetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    remove,
  } = useVocabularyInfinite({ query: debouncedQuery, activeFilters, sort, apiFilters })

  const isRefetching = isFetching && !isLoading

  // ── Display state ─────────────────────────────────────────────────────────

  const knownTotalRef = useRef<number | null>(null)
  if (!isLoading && !isError && !debouncedQuery && activeFilters.length === 0 && !hasNonBoardApiFilters) {
    knownTotalRef.current = total
  }
  const knownTotal = knownTotalRef.current

  // "Filtering" means something other than just a board is active
  const isFiltering = debouncedQuery.length > 0 || activeFilters.length > 0 || hasNonBoardApiFilters

  const showToolbar = !isLoading && !isError && (
    isFiltering || !!urlBoard ||
    items.length > 0 ||
    (knownTotal !== null && knownTotal > 0)
  )

  const isEmpty = !isLoading && !isError && !isFiltering && !urlBoard && total === 0

  // Clear only non-board filters — board stays as the navigation context
  const handleClearFilters = useCallback(() => {
    const { boardId: _, ...withoutBoard } = apiFilters
    const keysToUnset = Object.keys(withoutBoard).reduce(
      (acc, k) => ({ ...acc, [k]: undefined }),
      {} as Record<string, undefined>,
    )
    setApiFilter(keysToUnset)
    activeFilters.forEach(handleFilterToggle)
    if (inputValue) handleQueryChange('')
  }, [apiFilters, setApiFilter, activeFilters, handleFilterToggle, inputValue, handleQueryChange])

  // ── Page title context ────────────────────────────────────────────────────

  const pageTitle = activeBoard?.name ?? 'My Vocabulary'
  const wordCountText = (() => {
    if (knownTotal === null || knownTotal === 0) return null
    const noun = `word${knownTotal !== 1 ? 's' : ''}`
    return activeBoard
      ? `${knownTotal} ${noun} in ${activeBoard.name}`
      : `${knownTotal} saved ${noun}`
  })()

  return (
    <PageLayout>
      <Container as="main" width="wide">
        {/* ── Two-column layout: sidebar (desktop) + content ──────────── */}
        <div className={[styles.pageLayout, featureFlags.boardsTags ? '' : styles.pageLayoutNoSidebar].join(' ').trim()}>

          {/* Desktop sidebar — hidden on mobile/tablet via CSS */}
          {featureFlags.boardsTags && (
            <VocabularyBoardsSidebar
              activeBoardId={urlBoard}
              onSelect={handleBoardSelect}
            />
          )}

          {/* Main content column */}
          <div className={styles.mainColumn}>

            {/* ── Page header ───────────────────────────────────────────── */}
            <div className={styles.pageHeader}>
              <div className={styles.headingRow}>
                <Text variant="title" as="h1" className={styles.heading}>
                  {pageTitle}
                </Text>
                {/* Breadcrumb back to all — only when inside a board */}
                {activeBoard && (
                  <button
                    type="button"
                    className={styles.allVocabLink}
                    onClick={() => handleBoardSelect(undefined)}
                    aria-label="Back to all vocabulary"
                  >
                    ← All
                  </button>
                )}
              </div>
              {isLoading ? (
                <div className={styles.skeletonWordCount} aria-hidden="true" />
              ) : wordCountText ? (
                <Text variant="body" color="secondary" as="p" className={styles.wordCount}>
                  {wordCountText}
                </Text>
              ) : null}
            </div>

            {isLoading ? (
              <>
                <ToolbarSkeleton />
                <ListSkeleton />
              </>
            ) : isError ? (
              <Text variant="body" color="secondary" as="p">
                Failed to load vocabulary. Please try again.
              </Text>
            ) : (
              <div className={[styles.contentArea, isRefetching ? styles.contentAreaFetching : ''].join(' ').trim()}>
                {isRefetching && <div className={styles.fetchingBar} aria-hidden="true" />}

                {showToolbar && (
                  <>
                    {/* Mobile boards selector — shown only below 1024px */}
                    {featureFlags.boardsTags && (
                      <MobileBoardsSelector
                        activeBoardId={urlBoard}
                        onSelect={handleBoardSelect}
                      />
                    )}

                    <VocabularyToolbar
                      query={inputValue}
                      viewMode={viewMode}
                      onQueryChange={handleQueryChange}
                      onViewModeChange={setViewMode}
                    />
                    <VocabularyFilterBar
                      filters={apiFilters}
                      hasActiveFilters={hasFilterBarFilters}
                      onSetFilter={setApiFilter}
                      onClear={handleClearFilters}
                      legacyFilters={activeFilters}
                      onLegacyFilterToggle={handleFilterToggle}
                      sort={sort}
                      onSortChange={handleSortChange}
                    />
                  </>
                )}

                {/* Board review entry point */}
                {featureFlags.boardsTags && urlBoard && (
                  <BoardReviewBanner boardId={urlBoard} />
                )}

                <div className={[styles.listWrapper, isRefetching ? styles.fetching : ''].join(' ').trim()}>
                  <WordDetailProvider onRemove={remove} context="vocabulary">
                    <VocabularyPageContent
                      items={items}
                      onRemove={remove}
                      viewMode={viewMode}
                      isEmpty={isEmpty}
                      hasActiveFilters={isFiltering}
                      hasNextPage={hasNextPage}
                      isFetchingNextPage={isFetchingNextPage}
                      onLoadMore={fetchNextPage}
                      onClearFilters={handleClearFilters}
                    />
                  </WordDetailProvider>
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </PageLayout>
  )
}
