import { useRef, useState, useEffect } from 'react'
import { FilterBar } from '../../../shared/ui/FilterBar/FilterBar'
import { AdaptiveSheet } from '../../../shared/ui/AdaptiveSheet/AdaptiveSheet'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
import { useBoardsQuery } from '../../boards/model/useBoardsQuery'
import { useTagsQuery } from '../../tags/model/useTagsQuery'
import { featureFlags } from '../../../shared/lib/featureFlags'
import type { VocabularyFilters } from '../../../entities/vocabulary/model/filters'
import type { ReviewState } from '../../../entities/vocabulary/model/types'
import type { PartOfSpeech } from '../../../entities/vocabulary/model/filters'
import type { VocabularyFilter, SortOption } from '../model/cardState'
import { SORT_LABELS } from '../model/cardState'
import styles from './VocabularyFilterBar.module.css'

interface VocabularyFilterBarProps {
  filters: VocabularyFilters
  hasActiveFilters: boolean
  onSetFilter: (partial: Partial<VocabularyFilters>) => void
  onClear: () => void
  /** Legacy chip filters (difficult, savedRecently, etc.) */
  legacyFilters: VocabularyFilter[]
  onLegacyFilterToggle: (f: VocabularyFilter) => void
  sort: SortOption
  onSortChange: (s: SortOption) => void
}

const POS_OPTIONS: { value: PartOfSpeech; label: string }[] = [
  { value: 'noun',       label: 'Noun' },
  { value: 'verb',       label: 'Verb' },
  { value: 'adjective',  label: 'Adj' },
  { value: 'adverb',     label: 'Adv' },
]

const ADVANCED_REVIEW_OPTIONS: { value: ReviewState; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'mastered', label: 'Mastered' },
]

const ADVANCED_TIME_OPTIONS: { value: VocabularyFilter; label: string }[] = [
  { value: 'reviewedRecently', label: 'Reviewed recently' },
  { value: 'neverReviewed',    label: 'Never reviewed' },
]

/**
 * Vocabulary filter bar — single scrollable chip row.
 *
 * Primary chips: [All] [Due] [New] [Difficult] [Saved recently] | [More ▾]
 * Sort lives in the FilterBar end-cap (fixed, non-scrolling).
 * "More" opens a sheet with boards, tags, POS, review maturity, time filters.
 */
export function VocabularyFilterBar({
  filters,
  hasActiveFilters,
  onSetFilter,
  onClear,
  legacyFilters,
  onLegacyFilterToggle,
  sort,
  onSortChange,
}: VocabularyFilterBarProps) {
  const [moreOpen,  setMoreOpen]  = useState(false)
  const [sortOpen,  setSortOpen]  = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  const { data: boards = [] } = useBoardsQuery()
  const { data: tags   = [] } = useTagsQuery()
  const activeBoards = boards.filter((b) => !b.isArchived)

  // Close sort dropdown on outside click / Escape
  useEffect(() => {
    if (!sortOpen) return
    const onPointer = (e: PointerEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSortOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [sortOpen])

  // ── Active state helpers ──────────────────────────────────────────────────

  const isDue          = filters.reviewState === 'due'
  const isNew          = filters.reviewState === 'new'
  const isDifficult    = legacyFilters.includes('difficult')
  const isSaved        = legacyFilters.includes('savedRecently')
  const isAllActive    = !filters.reviewState && !filters.boardId &&
                         !filters.tagIds?.length && !filters.partOfSpeech &&
                         legacyFilters.length === 0

  const hasMoreFilters =
    (filters.reviewState === 'upcoming' || filters.reviewState === 'mastered') ||
    !!filters.partOfSpeech ||
    !!filters.boardId ||
    !!filters.tagIds?.length ||
    ADVANCED_TIME_OPTIONS.some((o) => legacyFilters.includes(o.value))

  // ── Toggle helpers ────────────────────────────────────────────────────────

  const toggleReviewState = (value: ReviewState) => {
    onSetFilter({ reviewState: filters.reviewState === value ? undefined : value })
  }

  const currentSortLabel = SORT_LABELS[sort] ?? 'Newest first'

  return (
    <>
      <FilterBar
        hasActiveFilters={hasActiveFilters}
        onClear={onClear}
        ariaLabel="Vocabulary filters"
      >
        {/* ── All chip ──────────────────────────────────────────────────── */}
        <button
          type="button"
          role="switch"
          aria-checked={isAllActive}
          className={[styles.chip, isAllActive ? styles.chipActive : ''].join(' ')}
          onClick={onClear}
        >
          All
        </button>

        <span className={styles.chipDivider} aria-hidden="true" />

        {/* ── Due chip ──────────────────────────────────────────────────── */}
        <button
          type="button"
          role="switch"
          aria-checked={isDue}
          className={[styles.chip, isDue ? styles.chipActive : ''].join(' ')}
          onClick={() => toggleReviewState('due')}
        >
          <span className={[styles.dot, styles.dot_due].join(' ')} aria-hidden="true" />
          Due
        </button>

        {/* ── New chip ──────────────────────────────────────────────────── */}
        <button
          type="button"
          role="switch"
          aria-checked={isNew}
          className={[styles.chip, isNew ? styles.chipActive : ''].join(' ')}
          onClick={() => toggleReviewState('new')}
        >
          <span className={[styles.dot, styles.dot_new].join(' ')} aria-hidden="true" />
          New
        </button>

        {/* ── Difficult chip ────────────────────────────────────────────── */}
        <button
          type="button"
          role="switch"
          aria-checked={isDifficult}
          className={[styles.chip, isDifficult ? styles.chipActive : ''].join(' ')}
          onClick={() => onLegacyFilterToggle('difficult')}
        >
          <span className={[styles.dot, styles.dot_difficult].join(' ')} aria-hidden="true" />
          Difficult
        </button>

        {/* ── Saved recently chip ───────────────────────────────────────── */}
        <button
          type="button"
          role="switch"
          aria-checked={isSaved}
          className={[styles.chip, isSaved ? styles.chipActive : ''].join(' ')}
          onClick={() => onLegacyFilterToggle('savedRecently')}
        >
          <span className={[styles.dot, styles.dot_saved].join(' ')} aria-hidden="true" />
          Saved recently
        </button>

        {/* ── More filters ──────────────────────────────────────────────── */}
        <button
          type="button"
          className={[styles.chip, styles.moreChip, hasMoreFilters ? styles.chipActive : ''].join(' ')}
          onClick={() => setMoreOpen(true)}
          aria-label="More filters"
        >
          <FilterIcon />
          More filters
          {hasMoreFilters && <span className={styles.moreDot} aria-hidden="true" />}
        </button>

        {/* ── Sort — inline dropdown like old toolbar ────────────────────── */}
        <div className={styles.sortWrap} ref={sortRef}>
          <button
            type="button"
            className={[styles.sortBtn, sort !== 'newest' ? styles.sortBtnActive : ''].join(' ')}
            onClick={() => setSortOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
          >
            {currentSortLabel}
            <ChevronIcon />
          </button>
          {sortOpen && (
            <div className={styles.sortDropdown} role="listbox" aria-label="Sort vocabulary">
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="option"
                  aria-selected={sort === value}
                  className={[styles.sortOption, sort === value ? styles.sortOptionActive : ''].join(' ')}
                  onClick={() => { onSortChange(value); setSortOpen(false) }}
                >
                  {label}
                  {sort === value && <CheckIcon />}
                </button>
              ))}
            </div>
          )}
        </div>
      </FilterBar>

      {/* ── More filters sheet ────────────────────────────────────────────── */}
      <AdaptiveSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        label="More filters"
      >
        <BottomSheetContent>
          <div className={styles.sheetHeader}>
            <h2 className={styles.sheetTitle}>More filters</h2>
            <button
              type="button"
              className={styles.sheetCloseBtn}
              onClick={() => setMoreOpen(false)}
              aria-label="Close"
            >
              <XIcon />
            </button>
          </div>

          {/* Boards */}
          {featureFlags.boardsTags && activeBoards.length > 0 && (
            <div className={styles.filterGroup}>
              <p className={styles.groupLabel}>Board</p>
              <div className={styles.groupChips}>
                {activeBoards.map((b) => {
                  const active = filters.boardId === b.id
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="switch"
                      aria-checked={active}
                      className={[styles.groupChip, active ? styles.groupChipActive : ''].join(' ')}
                      onClick={() => onSetFilter({ boardId: active ? undefined : b.id })}
                    >
                      {b.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {featureFlags.boardsTags && tags.length > 0 && (
            <div className={styles.filterGroup}>
              <p className={styles.groupLabel}>Tag</p>
              <div className={styles.groupChips}>
                {tags.map((t) => {
                  const active = (filters.tagIds ?? []).includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="switch"
                      aria-checked={active}
                      className={[styles.groupChip, active ? styles.groupChipActive : ''].join(' ')}
                      onClick={() => {
                        const current = filters.tagIds ?? []
                        const updated = active
                          ? current.filter((id) => id !== t.id)
                          : [...current, t.id]
                        onSetFilter({ tagIds: updated.length > 0 ? updated : undefined })
                      }}
                    >
                      {t.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Review maturity */}
          <div className={styles.filterGroup}>
            <p className={styles.groupLabel}>Review maturity</p>
            <div className={styles.groupChips}>
              {ADVANCED_REVIEW_OPTIONS.map((opt) => {
                const active = filters.reviewState === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="switch"
                    aria-checked={active}
                    className={[styles.groupChip, active ? styles.groupChipActive : ''].join(' ')}
                    onClick={() => onSetFilter({ reviewState: active ? undefined : opt.value })}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time filters */}
          <div className={styles.filterGroup}>
            <p className={styles.groupLabel}>Time</p>
            <div className={styles.groupChips}>
              {ADVANCED_TIME_OPTIONS.map((opt) => {
                const active = legacyFilters.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="switch"
                    aria-checked={active}
                    className={[styles.groupChip, active ? styles.groupChipActive : ''].join(' ')}
                    onClick={() => onLegacyFilterToggle(opt.value)}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Part of speech */}
          <div className={styles.filterGroup}>
            <p className={styles.groupLabel}>Part of speech</p>
            <div className={styles.groupChips}>
              {POS_OPTIONS.map((opt) => {
                const active = filters.partOfSpeech === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="switch"
                    aria-checked={active}
                    className={[styles.groupChip, active ? styles.groupChipActive : ''].join(' ')}
                    onClick={() =>
                      onSetFilter({ partOfSpeech: active ? undefined : (opt.value as PartOfSpeech) })
                    }
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/*
           * The footer is ALWAYS rendered so modal height never changes after
           * the user selects a filter. Toggling conditional rendering causes
           * a height jump that shifts the entire modal position.
           * Instead: reserve the space always, toggle visibility only.
           */}
          <div className={styles.sheetClear}>
            <button
              type="button"
              className={styles.sheetClearBtn}
              aria-hidden={!hasMoreFilters}
              tabIndex={hasMoreFilters ? undefined : -1}
              style={{ visibility: hasMoreFilters ? 'visible' : 'hidden' }}
              onClick={() => {
                if (filters.reviewState === 'upcoming' || filters.reviewState === 'mastered') {
                  onSetFilter({ reviewState: undefined })
                }
                onSetFilter({ partOfSpeech: undefined, boardId: undefined, tagIds: undefined })
                ADVANCED_TIME_OPTIONS.forEach((o) => {
                  if (legacyFilters.includes(o.value)) onLegacyFilterToggle(o.value)
                })
              }}
            >
              Clear these filters
            </button>
          </div>
        </BottomSheetContent>
      </AdaptiveSheet>
    </>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function FilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="6"  x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginLeft: 4 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  )
}
