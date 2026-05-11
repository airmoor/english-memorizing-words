import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
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
import { useVocabulary } from '../../features/vocabulary/model/useVocabulary'
import { applyVocabularyView } from '../../features/vocabulary/model/cardState'
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
  allItems: VocabularyWord[]   // full list for URL word restoration
  items: VocabularyWord[]      // filtered list for navigation + render
  onRemove: (wordId: string) => void
  viewMode: ViewMode
  isEmpty: boolean
}

function VocabularyPageContent({ allItems, items, onRemove, viewMode, isEmpty }: ContentProps) {
  const detail = useWordDetail()

  useWordDetailUrl({
    detail,
    vocabularyItems: allItems,
    open: detail.open,
    close: detail.close,
  })

  return (
    <VocabularyList
      items={items}
      onRemove={onRemove}
      viewMode={viewMode}
      isEmpty={isEmpty}
    />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function VocabularyPage() {
  const { items, isLoading, isError, remove } = useVocabulary()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useViewMode()

  // ── URL-backed filter state ────────────────────────────────────────────────

  const query = searchParams.get('q') ?? ''
  const activeFilters = useMemo(
    () => (searchParams.get('f') ?? '').split(',').filter(Boolean) as VocabularyFilter[],
    [searchParams],
  )
  const sort = (searchParams.get('s') ?? 'newest') as SortOption

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
      }, 200)
    },
    [setSearchParams],
  )
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const handleFilterToggle = useCallback(
    (f: VocabularyFilter) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
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

  // Clear all active filters at once
  const handleClearFilters = useCallback(() => {
    activeFilters.forEach(handleFilterToggle)
  }, [activeFilters, handleFilterToggle])

  // ── Filtered + sorted list ─────────────────────────────────────────────────

  const filteredItems = useMemo(
    () =>
      isLoading || isError
        ? []
        : applyVocabularyView(items, { query, activeFilters, sort }),
    [items, query, activeFilters, sort, isLoading, isError],
  )

  const showToolbar = !isLoading && !isError && items.length > 0
  const isEmpty = !isLoading && !isError && items.length === 0

  return (
    <PageLayout>
      <Container as="main" width="wide">
        <div className={styles.pageHeader}>
          <Text variant="title" as="h1" className={styles.heading}>
            My Vocabulary
          </Text>
          {!isLoading && !isError && items.length > 0 && (
            <Text variant="body" color="secondary" as="p" className={styles.wordCount}>
              {items.length} saved word{items.length !== 1 ? 's' : ''}
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
            filteredCount={filteredItems.length}
            totalCount={items.length}
            onQueryChange={handleQueryChange}
            onFilterToggle={handleFilterToggle}
            onSortChange={handleSortChange}
            onViewModeChange={setViewMode}
          />
        )}

        {!isLoading && !isError && (
          <WordDetailProvider onRemove={remove} context="vocabulary">
            <VocabularyPageContent
              allItems={items}
              items={filteredItems}
              onRemove={remove}
              viewMode={viewMode}
              isEmpty={isEmpty}
            />
          </WordDetailProvider>
        )}
      </Container>
    </PageLayout>
  )
}
