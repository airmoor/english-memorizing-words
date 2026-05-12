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
import { useVocabularyInfinite } from '../../features/vocabulary/model/useVocabularyInfinite'
import type { VocabularyFilter, SortOption } from '../../features/vocabulary/model/cardState'
import type { ViewMode } from '../../features/vocabulary/ui/VocabularyToolbar'
import type { VocabularyWord } from '../../entities/vocabulary/model/types'
import styles from './VocabularyPage.module.css'

// ── Skeleton loading placeholders ─────────────────────────────────────────────
// Pre-allocate the spatial footprint of toolbar + list so the page layout
// doesn't reflow when data arrives. Skeleton dimensions closely match the
// real components so the swap is a smooth fade rather than a jump.

function ToolbarSkeleton() {
  return (
    <div className={styles.skeletonToolbar} aria-hidden="true">
      <div className={styles.skeletonTopRow}>
        <div className={styles.skeletonSearch} />
        <div className={styles.skeletonControl} style={{ width: 94 }} />
        <div className={styles.skeletonControl} style={{ width: 74 }} />
      </div>
      <div className={styles.skeletonChipRow}>
        {/* State chips — widths approximate real label lengths */}
        <div className={styles.skeletonChip} style={{ width: 54 }} />
        <div className={styles.skeletonChip} style={{ width: 88 }} />
        <div className={styles.skeletonChip} style={{ width: 76 }} />
        <div className={styles.skeletonChip} style={{ width: 76 }} />
        <div className={styles.skeletonChip} style={{ width: 96 }} />
        <div className={styles.skeletonDivider} />
        {/* Special chips */}
        <div className={styles.skeletonChip} style={{ width: 84 }} />
        <div className={styles.skeletonChip} style={{ width: 122 }} />
        <div className={styles.skeletonChip} style={{ width: 116 }} />
        <div className={styles.skeletonChip} style={{ width: 136 }} />
      </div>
    </div>
  )
}

// Skeleton card data — (wordWidth, defWidths[])
// Varying proportions give a natural look without randomness.
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

// ── Inner component — inside WordDetailProvider, has access to useWordDetail ──

interface ContentProps {
  items: VocabularyWord[]
  onRemove: (wordId: string) => void
  viewMode: ViewMode
  isEmpty: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}

function VocabularyPageContent({
  items,
  onRemove,
  viewMode,
  isEmpty,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
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
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function VocabularyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode]         = useViewMode()

  // ── URL-backed filter state (filters + sort sync immediately) ─────────────

  const activeFilters = (searchParams.get('f') ?? '').split(',').filter(Boolean) as VocabularyFilter[]
  const sort          = (searchParams.get('s') ?? 'newest') as SortOption

  // ── Search input — decoupled from URL ─────────────────────────────────────
  //
  // Three distinct layers:
  //   inputValue     — immediate, controls the <input> element
  //   debouncedQuery — 300 ms delayed, drives the API call and URL ?q= param
  //   URL ?q=        — output of debouncedQuery (never read back into inputValue)
  //
  // This ensures typing always feels native and instant while network requests
  // remain debounced. Same pattern as SearchPage.

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
      // Instant clear — no debounce when emptying the field
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

  // ── Filter / sort handlers (immediate, no debounce needed) ────────────────

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

  // ── Data — driven by debouncedQuery, not inputValue ───────────────────────

  const {
    items,
    total,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    remove,
  } = useVocabularyInfinite({ query: debouncedQuery, activeFilters, sort })

  // ── Display state ─────────────────────────────────────────────────────────

  // Track total unfiltered word count for the page header.
  // Only updated when no search/filter is active so it reflects the real total.
  const [knownTotal, setKnownTotal] = useState<number | null>(null)
  useEffect(() => {
    if (!debouncedQuery && activeFilters.length === 0 && !isLoading && !isError) {
      setKnownTotal(total)
    }
  }, [total, debouncedQuery, activeFilters.length, isLoading, isError])

  // Active filtering: either the committed query or any filter chip is on.
  const isFiltering = debouncedQuery.length > 0 || activeFilters.length > 0

  // Toolbar is always shown once loading resolves — as long as the user has
  // words OR there are active filters (user must be able to clear them).
  // This prevents the broken dead-end state after a refresh with ?q= in the URL.
  const showToolbar = !isLoading && !isError && (
    isFiltering ||
    items.length > 0 ||
    (knownTotal !== null && knownTotal > 0)
  )

  // Truly empty: user has zero saved words (unfiltered, confirmed by server).
  const isEmpty = !isLoading && !isError && !isFiltering && total === 0

  return (
    <PageLayout>
      <Container as="main" width="wide">
        <div className={styles.pageHeader}>
          <Text variant="title" as="h1" className={styles.heading}>
            My Vocabulary
          </Text>
          {knownTotal !== null && knownTotal > 0 && (
            <Text variant="body" color="secondary" as="p" className={styles.wordCount}>
              {knownTotal} saved word{knownTotal !== 1 ? 's' : ''}
            </Text>
          )}
        </div>

        {/* ── Loading: skeleton placeholders occupy the same space as the
            real toolbar + list so no layout reflow occurs when data arrives.
            ── Loaded: toolbar + list fade in as one unit via .contentArea. */}
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
          <div className={styles.contentArea}>
            {showToolbar && (
              <VocabularyToolbar
                query={inputValue}
                activeFilters={activeFilters}
                sort={sort}
                viewMode={viewMode}
                filteredCount={total}
                onQueryChange={handleQueryChange}
                onFilterToggle={handleFilterToggle}
                onSortChange={handleSortChange}
                onViewModeChange={setViewMode}
              />
            )}
            <WordDetailProvider onRemove={remove} context="vocabulary">
              <VocabularyPageContent
                items={items}
                onRemove={remove}
                viewMode={viewMode}
                isEmpty={isEmpty}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={fetchNextPage}
              />
            </WordDetailProvider>
          </div>
        )}
      </Container>
    </PageLayout>
  )
}
