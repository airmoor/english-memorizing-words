import { useCallback, useState } from 'react'
import type { VocabularyFilters } from '../../../entities/vocabulary/model/filters'

interface UseVocabularyFiltersReturn {
  /** Current filter state */
  filters: VocabularyFilters
  /**
   * Update one or more filter fields.
   * Pass `undefined` for a key to clear that filter dimension.
   *
   * @example
   *   setFilter({ boardId: 'abc' })          // set board filter
   *   setFilter({ boardId: undefined })       // clear board filter
   *   setFilter({ tagIds: ['x', 'y'] })       // set tag filter
   */
  setFilter: (partial: Partial<VocabularyFilters>) => void
  /** Reset all filters to their empty state */
  clearFilters: () => void
  /**
   * True when at least one filter dimension has an active (non-undefined) value.
   * Use to conditionally show the "Clear" button in FilterBar.
   */
  hasActiveFilters: boolean
}

const EMPTY_FILTERS: VocabularyFilters = {}

/**
 * Manages vocabulary list filter state.
 *
 * Usage:
 * ```tsx
 * const { filters, setFilter, clearFilters, hasActiveFilters } = useVocabularyFilters()
 *
 * // In FilterBar:
 * <FilterBar hasActiveFilters={hasActiveFilters} onClear={clearFilters}>
 *   <ChipSelect ... onChange={v => setFilter({ reviewState: v })} />
 * </FilterBar>
 *
 * // In vocabulary query:
 * useVocabularyQuery(filters)
 * ```
 */
export function useVocabularyFilters(): UseVocabularyFiltersReturn {
  const [filters, setFilters] = useState<VocabularyFilters>(EMPTY_FILTERS)

  const setFilter = useCallback((partial: Partial<VocabularyFilters>) => {
    setFilters(prev => {
      const next = { ...prev, ...partial }
      // Remove keys explicitly set to undefined to keep the object clean
      for (const key of Object.keys(next) as (keyof VocabularyFilters)[]) {
        if (next[key] === undefined) delete next[key]
        // Also treat empty array tagIds as "no filter"
        if (key === 'tagIds' && Array.isArray(next[key]) && (next[key] as string[]).length === 0) {
          delete next[key]
        }
      }
      return next
    })
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
  }, [])

  const hasActiveFilters = Object.keys(filters).length > 0

  return { filters, setFilter, clearFilters, hasActiveFilters }
}
