import { useCallback, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useNavigate } from '../../shared/lib/useAppNavigate'
import { Play, Upload, ArrowLeft } from 'lucide-react'
import { Icon } from '../../shared/ui/Icon/Icon'
import { Text } from '../../shared/ui/Typography/Typography'
import { Container } from '../../shared/ui/layout/Container'
import { PageLayout } from '../../shared/ui/layout/PageLayout'
import { WordDetailProvider } from '../../shared/ui/WordDetail'
import { useWordDetail } from '../../shared/ui/WordDetail'
import { useWordDetailUrl } from '../../shared/ui/WordDetail/useWordDetailUrl'
import { Card } from '../../shared/ui/Card/Card'
import { VocabularyList } from '../../features/vocabulary/ui/VocabularyList'
import { VocabularyToolbar } from '../../features/vocabulary/ui/VocabularyToolbar'
import { VocabularyFilterBar } from '../../features/vocabulary/ui/VocabularyFilterBar'
import { DragPreviewPill } from '../../features/vocabulary/ui/DragPreviewPill'
import { VocabularyBoardsSidebar } from '../../features/boards/ui/VocabularyBoardsSidebar'
import { MobileBoardsSelector } from '../../features/boards/ui/MobileBoardsSelector'
import { CreateBoardSheet } from '../../features/boards'
import { useAssignCardToBoard } from '../../features/boards/model/useCardBoardMutation'
import { useVocabularyInfinite } from '../../features/vocabulary/model/useVocabularyInfinite'
import { useVocabularyFilters } from '../../features/vocabulary/model/useVocabularyFilters'
import { useBoardsQuery } from '../../features/boards'
import { toast } from '../../shared/ui/Toast'
import { featureFlags } from '../../shared/lib/featureFlags'
import type { VocabularyFilter, SortOption } from '../../features/vocabulary/model/cardState'
import type { ViewMode } from '../../features/vocabulary/ui/VocabularyToolbar'
import type { VocabularyWord } from '../../entities/vocabulary'
import itemStyles from '../../features/vocabulary/ui/VocabularyItem.module.css'
import compactStyles from '../../features/vocabulary/ui/VocabularyItemCompact.module.css'
import listStyles from '../../features/vocabulary/ui/VocabularyList.module.css'
import styles from './VocabularyPage.module.css'

// ── Skeleton loading placeholders ─────────────────────────────────────────────
// Built from the same CSS modules as the loaded list, so compact/detailed
// rows occupy the same grid as real items. Count undershoots a typical
// first page — the list grows downward instead of the page shrinking.

const COMPACT_ROWS = ['8ch', '11ch', '7ch', '10ch', '9ch'] as const
const DETAILED_ROWS: [string, number][] = [
  ['8ch', 1],
  ['11ch', 2],
  ['7ch', 1],
  ['10ch', 1],
  ['9ch', 2],
]

function ListSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'compact') {
    return (
      <ul className={[listStyles.listCompact, styles.skeletonList].join(' ')} aria-hidden="true">
        {COMPACT_ROWS.map((w, i) => (
          <li key={i} className={compactStyles.row}>
            <span className={[compactStyles.dot, styles.skeletonFill].join(' ')} />
            <div className={compactStyles.wordBlock}>
              <span className={compactStyles.word}>
                <span className={styles.skeletonBlock} style={{ width: w }} />
              </span>
              <span className={compactStyles.transcription}>
                <span className={styles.skeletonBlock} style={{ width: '6ch' }} />
              </span>
            </div>
            {featureFlags.boardsTags && <span className={compactStyles.addBoardBtn} />}
            <span className={compactStyles.deleteBtn} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className={[listStyles.list, styles.skeletonList].join(' ')} aria-hidden="true">
      {DETAILED_ROWS.map(([w, defs], i) => (
        <Card
          key={i}
          as="li"
          padding="sm"
          className={[itemStyles.item, styles.skeletonItem].join(' ')}
        >
          <div className={itemStyles.rowButton}>
            <div className={itemStyles.wordRow}>
              <span className={itemStyles.word}>
                <span className={styles.skeletonBlock} style={{ width: w }} />
              </span>
            </div>
            <ul className={itemStyles.meanings}>
              {Array.from({ length: defs }, (_, j) => (
                <li key={j} className={itemStyles.meaning}>
                  <span className={styles.skeletonPos}>noun</span>
                  <span className={itemStyles.definition}>
                    <span className={styles.skeletonBlock} style={{ width: j === 0 ? '72%' : '54%' }} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className={itemStyles.rowActions}>
            {featureFlags.boardsTags && <span className={itemStyles.addBoardBtn} />}
            <span className={itemStyles.removeBtn} />
          </div>
        </Card>
      ))}
    </ul>
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
  searchQuery?: string
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  onClearFilters?: () => void
  onGoToAllVocabulary: () => void
  /** The board currently scoping this list, if the user is inside a board (not "All Vocabulary"). */
  activeBoard?: { id: string; name: string }
}

function VocabularyPageContent({
  items,
  onRemove,
  viewMode,
  isEmpty,
  isEmptyBoard,
  hasActiveFilters,
  searchQuery,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onClearFilters,
  onGoToAllVocabulary,
  activeBoard,
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
      searchQuery={searchQuery}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      onClearFilters={onClearFilters}
      onGoToAllVocabulary={onGoToAllVocabulary}
      activeBoard={activeBoard}
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

  // ── Drag-to-board ─────────────────────────────────────────────────────────
  //
  // Desktop-pointer only (see useIsPointerDesktop in the draggable rows /
  // droppable sidebar items) — dragging is additive to the existing "Add to
  // board" button + BoardPickerSheet, never a replacement, so keyboard and
  // touch users keep a fully working path regardless.
  //
  // The 8px activation distance lets a plain click still open the word detail
  // panel / fire icon buttons; only a sustained pointer move starts a drag.

  const [draggedWord, setDraggedWord] = useState<string | null>(null)
  // Briefly identifies the board that just received a card via drag — lets the
  // sidebar flash a local success cue right where the drop happened, since the
  // global toast renders bottom-center and is easy to miss while looking at
  // the sidebar (see VocabularyBoardsSidebar's `justAdded` prop).
  const [recentlyAddedBoardId, setRecentlyAddedBoardId] = useState<string | null>(null)
  const assignToBoard = useAssignCardToBoard()
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as { wordText: string } | undefined
    setDraggedWord(data?.wordText ?? null)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggedWord(null)
    const overData = event.over?.data.current as { boardId: string; boardName: string } | undefined
    const activeData = event.active.data.current as
      | { wordId: string; cardId: string; wordText: string }
      | undefined
    if (!overData || !activeData) return

    const draggedItem = items.find((i) => i.wordId === activeData.wordId)
    if (draggedItem?.boards.some((b) => b.id === overData.boardId)) {
      toast.info(`Already in "${overData.boardName}"`)
      return
    }

    assignToBoard.mutate({
      boardId: overData.boardId,
      cardId: activeData.cardId,
      wordId: activeData.wordId,
    })
    toast.success(`Added "${activeData.wordText}" to "${overData.boardName}"`)

    setRecentlyAddedBoardId(overData.boardId)
    window.setTimeout(() => {
      setRecentlyAddedBoardId((current) => (current === overData.boardId ? null : current))
    }, 700)
  }, [items, assignToBoard])

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
        <DndContext sensors={dndSensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className={[styles.pageLayout, featureFlags.boardsTags ? '' : styles.pageLayoutNoSidebar].join(' ').trim()}>

          {/* Desktop sidebar — hidden on mobile/tablet via CSS */}
          {featureFlags.boardsTags && (
            <VocabularyBoardsSidebar
              activeBoardId={urlBoard}
              onSelect={handleBoardSelect}
              recentlyAddedBoardId={recentlyAddedBoardId}
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
                    <Text variant="body" color="secondary" as="p" className={styles.wordCount} aria-hidden="true">
                      <span className={styles.skeletonText}>00 saved words</span>
                    </Text>
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
                  {isLoading ? (
                    <span className={[styles.reviewBtn, styles.reviewBtnSkeleton].join(' ')} aria-hidden="true">
                      <span className={styles.skeletonIcon} />
                      <span className={styles.skeletonText}>Review all</span>
                    </span>
                  ) : !isError && !isEmpty && (
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
                      <span className={styles.reviewLabelFull}>
                        {urlBoard
                          ? `Review ${activeBoard?.name ?? 'board'}`
                          : 'Review all'
                        }
                      </span>
                      <span className={styles.reviewLabelShort}>Review</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isError ? (
              <Text variant="body" color="secondary" as="p">
                Failed to load vocabulary. Please try again.
              </Text>
            ) : (
              <div className={[styles.contentArea, isRefetching ? styles.contentAreaFetching : ''].join(' ').trim()}>
                {isRefetching && <div className={styles.fetchingBar} aria-hidden="true" />}

                {(isLoading || showToolbar) && (
                  <>
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
                  {isLoading ? (
                    <ListSkeleton viewMode={viewMode} />
                  ) : (
                    <WordDetailProvider onRemove={remove} context="vocabulary">
                      <VocabularyPageContent
                        items={items}
                        onRemove={remove}
                        viewMode={viewMode}
                        isEmpty={isEmpty}
                        isEmptyBoard={isEmptyBoard}
                        hasActiveFilters={isFiltering}
                        searchQuery={committedQuery}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        onLoadMore={fetchNextPage}
                        onClearFilters={handleClearFilters}
                        onGoToAllVocabulary={() => handleBoardSelect(undefined)}
                        activeBoard={activeBoard}
                      />
                    </WordDetailProvider>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <DragOverlay>
          {draggedWord && <DragPreviewPill word={draggedWord} />}
        </DragOverlay>
        </DndContext>
      </Container>

      <CreateBoardSheet
        open={createBoardOpen}
        onClose={() => setCreateBoardOpen(false)}
        onCreated={(boardId) => handleBoardSelect(boardId)}
      />

    </PageLayout>
  )
}

