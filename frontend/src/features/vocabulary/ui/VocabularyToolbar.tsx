import { useRef, useState, useEffect } from 'react'
import type { VocabularyFilter, SortOption } from '../model/cardState'
import { CARD_STATE_LABELS, SORT_LABELS } from '../model/cardState'
import styles from './VocabularyToolbar.module.css'

export type ViewMode = 'detailed' | 'compact'

// Filter chip definitions — state filters first, then special filters
const STATE_FILTERS: { value: VocabularyFilter; label: string }[] = [
  { value: 'new',       label: CARD_STATE_LABELS.new },
  { value: 'learning',  label: CARD_STATE_LABELS.learning },
  { value: 'review',    label: CARD_STATE_LABELS.review },
  { value: 'mature',    label: CARD_STATE_LABELS.mature },
  { value: 'difficult', label: CARD_STATE_LABELS.difficult },
]

const SPECIAL_FILTERS: { value: VocabularyFilter; label: string }[] = [
  { value: 'dueToday',        label: 'Due today' },
  { value: 'neverReviewed',   label: 'Never reviewed' },
  { value: 'savedRecently',   label: 'Saved recently' },
  { value: 'reviewedRecently', label: 'Reviewed recently' },
]

interface Props {
  query: string
  activeFilters: VocabularyFilter[]
  sort: SortOption
  viewMode: ViewMode
  /** Total items matching current filters (from server). */
  filteredCount: number
  onQueryChange: (q: string) => void
  onFilterToggle: (f: VocabularyFilter) => void
  onSortChange: (s: SortOption) => void
  onViewModeChange: (m: ViewMode) => void
}

export function VocabularyToolbar({
  query,
  activeFilters,
  sort,
  viewMode,
  filteredCount,
  onQueryChange,
  onFilterToggle,
  onSortChange,
  onViewModeChange,
}: Props) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const sortRef   = useRef<HTMLDivElement>(null)
  const [sortOpen, setSortOpen] = useState(false)
  const isFiltered = activeFilters.length > 0 || query.trim().length > 0

  // Close sort dropdown on outside click or Escape
  useEffect(() => {
    if (!sortOpen) return
    function onPointer(e: PointerEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSortOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [sortOpen])

  return (
    <div className={styles.toolbar}>
      {/* ── Top row: search + sort + view mode ──────────────────────────── */}
      <div className={styles.topRow}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="search"
            className={styles.searchInput}
            placeholder="Filter words…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Search vocabulary"
          />
          {query && (
            <button
              className={styles.clearBtn}
              onClick={() => { onQueryChange(''); inputRef.current?.focus() }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className={styles.controls}>
          {/* Sort — icon-only trigger with popover */}
          <div className={styles.sortWrap} ref={sortRef}>
            <button
              type="button"
              className={[styles.sortBtn, sort !== 'newest' ? styles.sortBtnActive : ''].join(' ')}
              onClick={() => setSortOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              aria-label={`Sort: ${SORT_LABELS[sort]}`}
              title={`Sort: ${SORT_LABELS[sort]}`}
            >
              <SortIcon />
            </button>
            {sortOpen && (
              <div className={styles.sortDropdown} role="listbox" aria-label="Sort vocabulary">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="option"
                    aria-selected={sort === s}
                    className={[styles.sortOption, sort === s ? styles.sortOptionActive : ''].join(' ')}
                    onClick={() => { onSortChange(s); setSortOpen(false) }}
                  >
                    {SORT_LABELS[s]}
                    {sort === s && <CheckIcon className={styles.sortOptionCheck} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View mode toggle */}
          <div className={styles.viewToggle} role="group" aria-label="View mode">
            <button
              className={[styles.viewBtn, viewMode === 'detailed' ? styles.viewBtnActive : ''].join(' ')}
              onClick={() => onViewModeChange('detailed')}
              aria-pressed={viewMode === 'detailed'}
              title="Detailed view"
            >
              <DetailedIcon />
            </button>
            <button
              className={[styles.viewBtn, viewMode === 'compact' ? styles.viewBtnActive : ''].join(' ')}
              onClick={() => onViewModeChange('compact')}
              aria-pressed={viewMode === 'compact'}
              title="Compact view"
            >
              <CompactIcon />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter chips ─────────────────────────────────────────────────── */}
      <div className={styles.filterRow} role="group" aria-label="Filter by state">
        {STATE_FILTERS.map(({ value, label }) => (
          <FilterChip
            key={value}
            label={label}
            active={activeFilters.includes(value)}
            stateKey={value as string}
            onClick={() => onFilterToggle(value)}
          />
        ))}
        <span className={styles.filterDivider} aria-hidden="true" />
        {SPECIAL_FILTERS.map(({ value, label }) => (
          <FilterChip
            key={value}
            label={label}
            active={activeFilters.includes(value)}
            onClick={() => onFilterToggle(value)}
          />
        ))}
      </div>

      {/* ── Result count ─────────────────────────────────────────────────── */}
      {isFiltered && (
        <p className={styles.resultCount}>
          {`${filteredCount} word${filteredCount !== 1 ? 's' : ''}`}
          {activeFilters.length > 0 && (
            <button
              className={styles.clearFiltersBtn}
              onClick={() => activeFilters.forEach(onFilterToggle)}
            >
              Clear filters
            </button>
          )}
        </p>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  stateKey,
  onClick,
}: {
  label: string
  active: boolean
  stateKey?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      data-state={stateKey}
      className={[styles.chip, active ? styles.chipActive : ''].join(' ')}
      onClick={onClick}
    >
      {stateKey && <span className={[styles.chipDot, styles[`dot_${stateKey}`]].join(' ')} aria-hidden="true" />}
      {label}
    </button>
  )
}

function SortIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6"  x2="21" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function DetailedIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="7" rx="2" />
      <rect x="3" y="14" width="18" height="7" rx="2" />
    </svg>
  )
}

function CompactIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6"  x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
