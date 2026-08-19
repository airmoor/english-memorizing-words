import { useCallback, useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Play, Upload, ArrowLeft } from 'lucide-react'
import { Icon } from '../../shared/ui/Icon/Icon'
import { Text } from '../../shared/ui/Typography/Typography'
import { Container } from '../../shared/ui/layout/Container'
import { PageLayout } from '../../shared/ui/layout/PageLayout'
import { WordDetailProvider } from '../../shared/ui/WordDetail'
import { useWordDetail } from '../../shared/ui/WordDetail'
import { useWordDetailUrl } from '../../shared/ui/WordDetail/useWordDetailUrl'
import { VocabularyList } from '../../features/vocabulary/ui/VocabularyList'
import { VocabularyToolbar } from '../../features/vocabulary/ui/VocabularyToolbar'
import { VocabularyFilterBar } from '../../features/vocabulary/ui/VocabularyFilterBar'
import { VocabularyBoardsSidebar } from '../../features/boards/ui/VocabularyBoardsSidebar'
import { MobileBoardsSelector } from '../../features/boards/ui/MobileBoardsSelector'
import { CreateBoardSheet } from '../../features/boards'
import { useVocabularyInfinite } from '../../features/vocabulary/model/useVocabularyInfinite'
import { useVocabularyFilters } from '../../features/vocabulary/model/useVocabularyFilters'
import { useBoardsQuery } from '../../features/boards'
import { featureFlags } from '../../shared/lib/featureFlags'
import type { VocabularyFilter, SortOption } from '../../features/vocabulary/model/cardState'
import type { ViewMode } from '../../features/vocabulary/ui/VocabularyToolbar'
import type { VocabularyWord } from '../../entities/vocabulary'
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
      return stored === 'detailed' ? 'detailed' : 'compact'
    } catch {
      return 'compact'
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
  isEmptyBoard: boolean
  hasActiveFilters?: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  onClearFilters?: () => void
  onGoToAllVocabulary: () => void
}

function VocabularyPageContent({
  items,
  onRemove,
  viewMode,
  isEmpty,
  isEmptyBoard,
  hasActiveFilters,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onClearFilters,
  onGoToAllVocabulary,
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
      isEmptyBoard={isEmptyBoard}
      hasActiveFilters={hasActiveFilters}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      onClearFilters={onClearFilters}
      onGoToAllVocabulary={onGoToAllVocabulary}
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function VocabularyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode]         = useViewMode()
  const navigate                        = useNavigate()

  // ── URL-backed filter state ───────────────────────────────────────────────

  const activeFilters = (searchParams.get('f') ?? '').split(',').filter(Boolean) as VocabularyFilter[]
  const sort          = (searchParams.get('s') ?? 'newest') as SortOption

  // ── Search input ──────────────────────────────────────────────────────────
  //
  // Architecture: the URL ?q= param is the single source of truth for the
  // committed (debounced) query that drives the API call. There is no
  // separate debouncedQuery state — it is derived directly from the URL.
  //
  // inputValue is local state for what the text field displays. It stays ahead
  // of the URL while the user is typing (before the 300 ms debounce fires).
  //
  // When the URL's ?q= changes from an external source — back/forward nav, or
  // "View in vocabulary" pushing ?q=dog while already on this page — inputValue
  // must update to match. This is done with React's "setState during render"
  // pattern (tracking prevCommittedQuery), which avoids calling setState inside
  // a useEffect and the cascading-renders lint warning it triggers.

  const committedQuery = searchParams.get('q')?.trim() ?? ''

  const [inputValue, setInputValue] = useState(committedQuery)

  // "setState during render" sync: when committedQuery changes from an external
  // source, update inputValue to match without going through an effect.
  // React re-renders immediately with the new state; no paint occurs between.
  const [prevCommittedQuery, setPrevCommittedQuery] = useState(committedQuery)
  if (committedQuery !== prevCommittedQuery) {
    setPrevCommittedQuery(committedQuery)
    setInputValue(committedQuery)
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const handleQueryChange = useCallback((q: string) => {
    setInputValue(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q === '') {
      // Clear immediately — no debounce needed for an empty query
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('q')
        return next
      }, { replace: true })
      return
    }
    debounceRef.current = setTimeout(() => {
      const trimmed = q.trim()
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
  const { data: boards = [], isLoading: boardsLoading } = useBoardsQuery()
  const activeBoard = boards.find((b) => b.id === urlBoard)

  // ── Deep-linked "create board" intent ─────────────────────────────────────
  //
  // The Home page's "Create your first board" CTA links here with
  // ?createBoard=1 so the create flow opens immediately instead of just
  // landing on the generic vocabulary list. Seeded once from the URL, then
  // the param is stripped so refresh/back doesn't reopen the sheet.
  const [createBoardOpen, setCreateBoardOpen] = useState(
    () => searchParams.get('createBoard') === '1',
  )
  useEffect(() => {
    if (searchParams.get('createBoard') === '1') {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('createBoard')
        return next
      }, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Active-board cleanup: if the board in the URL no longer exists (e.g. it was
  // deleted), quietly return to "All Vocabulary" so the page doesn't show a
  // stale board context with no words.
  useEffect(() => {
    if (!urlBoard || boardsLoading || boards.length === 0) return
    const stillExists = boards.some((b) => b.id === urlBoard)
    if (!stillExists) {
      handleBoardSelect(undefined)
    }
  }, [boards, boardsLoading, urlBoard, handleBoardSelect])

  // ── Non-board active filters (used by FilterBar "clear" logic) ───────────
  const hasNonBoardApiFilters = Object.keys(apiFilters).some(
    (k) => k !== 'boardId',
  )
  const hasFilterBarFilters = hasNonBoardApiFilters || activeFilters.length > 0 || committedQuery.length > 0

  // ── Data ──────────────────────────────────────────────────────────────────

  const {
    items,
    total,
    contextTotal,
    isLoading,
    isError,
    isFetching,
    isPlaceholderData,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    remove,
  } = useVocabularyInfinite({ query: committedQuery, activeFilters, sort, apiFilters })

  const isRefetching = isFetching && !isLoading

  // ── Display state ─────────────────────────────────────────────────────────

  // `contextTotal` comes directly from the API (backend always computes the
  // board-scoped unfiltered count in the same request), so it is correct on
  // the very first load even when URL filters are already present.
  //
  // During a board switch, `isPlaceholderData` is true and `contextTotal` still
  // reflects the *previous* board's data.  We track the last "settled" board so
  // we can hide the count (show skeleton) while the new board's data is loading.
  const settledBoardRef = useRef<string | undefined>(undefined)
  if (!isPlaceholderData) {
    settledBoardRef.current = urlBoard
  }
  // Show the count only when the settled board matches the current URL board.
  // This prevents showing the previous board's total as a flash during switch.
  const stableContextTotal = settledBoardRef.current === urlBoard ? contextTotal : null

  // "Filtering" means something other than just a board is active
  const isFiltering = committedQuery.length > 0 || activeFilters.length > 0 || hasNonBoardApiFilters

  const showToolbar = !isLoading && !isError && (
    isFiltering || !!urlBoard ||
    items.length > 0 ||
    (stableContextTotal !== null && stableContextTotal > 0)
  )

  const isEmpty = !isLoading && !isError && !isFiltering && !urlBoard && total === 0

  // A board with genuinely zero words (not "this filter matched nothing") —
  // mutually exclusive with `isEmpty` by construction (`!urlBoard` above vs
  // `!!urlBoard` here). stableContextTotal is null mid-switch, which correctly
  // keeps this false rather than flashing the empty state during a board change.
  const isEmptyBoard = !isLoading && !isError && !isFiltering && !!urlBoard && stableContextTotal === 0

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

  // ── Review navigation ─────────────────────────────────────────────────────

  const handleReview = useCallback(() => {
    if (urlBoard) {
      const params = new URLSearchParams({ boardId: urlBoard })
      if (activeBoard?.name) params.set('boardName', activeBoard.name)
      navigate(`/review?${params.toString()}`)
    } else {
      navigate('/review')
    }
  }, [urlBoard, activeBoard, navigate])

  // ── Page title context ────────────────────────────────────────────────────

  const pageTitle = activeBoard?.name ?? 'My Vocabulary'
  const wordCountText = (() => {
    if (stableContextTotal === null || stableContextTotal === 0) return null
    const noun = `word${stableContextTotal !== 1 ? 's' : ''}`
    // When a search or filter is active, show "X of Y" so the user can see
    // both how many matched and how many words they have in total.
    if (isFiltering) {
      return activeBoard
        ? `${total} of ${stableContextTotal} ${noun} in ${activeBoard.name}`
        : `${total} of ${stableContextTotal} saved ${noun}`
    }
    return activeBoard
      ? `${stableContextTotal} ${noun} in ${activeBoard.name}`
      : `${stableContextTotal} saved ${noun}`
  })()

  return (
    <PageLayout>
      <Container as="main" width="xl">
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
              <div className={styles.headerRow}>
                {/* Left: title + word count */}
                <div className={styles.headerMain}>
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
                        <Icon icon={ArrowLeft} size={14} />
                        All
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

                {/* Right: import + review actions */}
                <div className={styles.headerAction}>
                  {/* Import button — navigates to the dedicated /import page */}
                  {featureFlags.vocabularyImport && (
                    <button
                      type="button"
                      className={styles.importBtn}
                      onClick={() => navigate('/import')}
                      aria-label="Import vocabulary"
                    >
                      <Icon icon={Upload} size={13} />
                      <span>Import</span>
                    </button>
                  )}
                  {/* Review button — shown when there's something to review */}
                  {!isLoading && !isError && !isEmpty && (
                    <button
                      type="button"
                      className={styles.reviewBtn}
                      onClick={handleReview}
                      aria-label={urlBoard
                        ? `Start review for ${activeBoard?.name ?? 'this board'}`
                        : 'Start vocabulary review'
                      }
                    >
                      <Icon icon={Play} size={12} />
                      <span>
                        {urlBoard
                          ? `Review ${activeBoard?.name ?? 'board'}`
                          : 'Review all'
                        }
                      </span>
                    </button>
                  )}
                </div>
              </div>
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

                <div className={[styles.listWrapper, isRefetching ? styles.fetching : ''].join(' ').trim()}>
                  <WordDetailProvider onRemove={remove} context="vocabulary">
                    <VocabularyPageContent
                      items={items}
                      onRemove={remove}
                      viewMode={viewMode}
                      isEmpty={isEmpty}
                      isEmptyBoard={isEmptyBoard}
                      hasActiveFilters={isFiltering}
                      hasNextPage={hasNextPage}
                      isFetchingNextPage={isFetchingNextPage}
                      onLoadMore={fetchNextPage}
                      onClearFilters={handleClearFilters}
                      onGoToAllVocabulary={() => handleBoardSelect(undefined)}
                    />
                  </WordDetailProvider>
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>

      <CreateBoardSheet
        open={createBoardOpen}
        onClose={() => setCreateBoardOpen(false)}
        onCreated={(boardId) => handleBoardSelect(boardId)}
      />

    </PageLayout>
  )
}

