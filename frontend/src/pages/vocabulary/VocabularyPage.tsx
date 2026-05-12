import { useCallback, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Spinner } from '../../shared/ui/Spinner'
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

  // ── URL-backed filter state ────────────────────────────────────────────────

  const query         = searchParams.get('q') ?? ''
  const activeFilters = (searchParams.get('f') ?? '').split(',').filter(Boolean) as VocabularyFilter[]
  const sort          = (searchParams.get('s') ?? 'newest') as SortOption

  // Debounce search query — update URL only after user pauses typing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleQueryChange = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            if (q) next.set('q', q)
            else next.delete('q')
            return next
          },
          { replace: true },
        )
      }, 300)
    },
    [setSearchParams],
  )
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

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

  // ── Data ───────────────────────────────────────────────────────────────────

  const {
    items,
    total,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    remove,
  } = useVocabularyInfinite({ query, activeFilters, sort })

  // Track total unfiltered word count for the page header.
  // Updated whenever the unfiltered query resolves (no search/filters active).
  const [knownTotal, setKnownTotal] = useState<number | null>(null)
  useEffect(() => {
    if (!query && activeFilters.length === 0 && !isLoading && !isError) {
      setKnownTotal(total)
    }
  }, [total, query, activeFilters.length, isLoading, isError])

  const isFiltering = query.length > 0 || activeFilters.length > 0
  const showToolbar = !isLoading && !isError && (knownTotal !== null && knownTotal > 0)
  // Truly empty: no words saved at all (unfiltered total is 0)
  const isEmpty     = !isLoading && !isError && !isFiltering && total === 0

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

        {isLoading && <Spinner />}

        {isError && (
          <Text variant="body" color="secondary" as="p">
            Failed to load vocabulary. Please try again.
          </Text>
        )}

        {showToolbar && (
          <VocabularyToolbar
            query={query}
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

        {!isLoading && !isError && (
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
        )}
      </Container>
    </PageLayout>
  )
}
