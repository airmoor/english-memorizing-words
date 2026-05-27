import { SlidersHorizontal, ChevronDown, Check, X } from 'lucide-react'
import { useRef, useState, useEffect, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../../shared/ui/Icon/Icon'

import { FilterBar } from '../../../shared/ui/FilterBar/FilterBar'
import { AdaptiveSheet } from '../../../shared/ui/AdaptiveSheet/AdaptiveSheet'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
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
  // Portal-based dropdown: separate refs for trigger button and menu
  const sortTriggerRef  = useRef<HTMLButtonElement>(null)
  const sortMenuRef     = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})

  const { data: tags = [] } = useTagsQuery()

  // Measure trigger position when the dropdown opens so the portal menu
  // can be positioned with `position: fixed` — bypasses FilterBar's
  // `overflow-y: hidden` scroll container that clips `position: absolute`.
  useEffect(() => {
    if (!sortOpen || !sortTriggerRef.current) return
    const rect = sortTriggerRef.current.getBoundingClientRect()
    setMenuStyle({
      position: 'fixed',
      top:   rect.bottom + 6,
      right: window.innerWidth - rect.right,
      zIndex: 200,
    })
  }, [sortOpen])

  // Close sort dropdown on outside click / Escape.
  // Check both the trigger button and the portal menu — the menu is in
  // document.body so a simple sortRef.contains() check would miss it.
  useEffect(() => {
    if (!sortOpen) return
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (
        !sortTriggerRef.current?.contains(target) &&
        !sortMenuRef.current?.contains(target)
      ) {
        setSortOpen(false)
      }
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
  // boardId is excluded here — it's navigation context, not a filter bar concern
  const isAllActive    = !filters.reviewState &&
                         !filters.tagIds?.length && !filters.partOfSpeech &&
                         legacyFilters.length === 0

  const hasMoreFilters =
    (filters.reviewState === 'upcoming' || filters.reviewState === 'mastered') ||
    !!filters.partOfSpeech ||
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
          <Icon icon={SlidersHorizontal} size={13} />
          More filters
          {hasMoreFilters && <span className={styles.moreDot} aria-hidden="true" />}
        </button>

        {/* ── Sort — portal dropdown (bypasses overflow-y:hidden on scroll row) */}
        <div className={styles.sortWrap}>
          <button
            ref={sortTriggerRef}
            type="button"
            className={[styles.sortBtn, sort !== 'newest' ? styles.sortBtnActive : ''].join(' ')}
            onClick={() => setSortOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
          >
            {currentSortLabel}
            <Icon icon={ChevronDown} size={11} />
          </button>
          {sortOpen && createPortal(
            <div
              ref={sortMenuRef}
              className={styles.sortDropdown}
              style={menuStyle}
              role="listbox"
              aria-label="Sort vocabulary"
            >
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
                  {sort === value && <Icon icon={Check} size={13} strokeWidth={2.5} style={{ marginLeft: 4 }} />}
                </button>
              ))}
            </div>,
            document.body,
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
              className={[styles.sheetCloseBtn, 'icon-action'].join(' ')}
              onClick={() => setMoreOpen(false)}
              aria-label="Close"
            >
              <Icon icon={X} size={16} />
            </button>
          </div>

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
                onSetFilter({ partOfSpeech: undefined, tagIds: undefined })
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

