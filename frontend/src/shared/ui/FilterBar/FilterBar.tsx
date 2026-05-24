import type { ReactNode } from 'react'
import styles from './FilterBar.module.css'

interface FilterBarProps {
  /** The chip / filter controls to render inside the scrollable row */
  children: ReactNode
  /** When true, the "Clear" button is shown */
  hasActiveFilters?: boolean
  /** Called when the "Clear" button is pressed */
  onClear?: () => void
  /** Optional sort button label — omit to hide the sort button entirely */
  sortLabel?: string
  /** Whether the sort button is in its "active" visual state */
  sortActive?: boolean
  /** Called when the sort button is pressed */
  onSort?: () => void
  /** aria-label for the scrollable region (defaults to "Filter bar") */
  ariaLabel?: string
}

/**
 * Sticky, horizontally scrollable bar for filter chips.
 *
 * Layout:
 *   [chips…]  |  [Clear]  [Sort ↕]
 *
 * - The chip area scrolls horizontally; the right-side actions stay fixed.
 * - A "Clear" button appears only when `hasActiveFilters` is true.
 * - A "Sort" button appears only when `sortLabel` is provided.
 * - Left/right edge fade hints scroll affordance without a visible scrollbar.
 */
export function FilterBar({
  children,
  hasActiveFilters,
  onClear,
  sortLabel,
  sortActive,
  onSort,
  ariaLabel = 'Filter bar',
}: FilterBarProps) {
  const showActions = hasActiveFilters || !!sortLabel

  return (
    <div className={styles.root}>
      <div
        className={styles.scroll}
        role="toolbar"
        aria-label={ariaLabel}
      >
        {children}

        {showActions && (
          <>
            <span className={styles.divider} aria-hidden="true" />
            <div className={styles.actions}>
              {hasActiveFilters && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={onClear}
                  aria-label="Clear all filters"
                >
                  ✕ Clear
                </button>
              )}
              {sortLabel && (
                <button
                  type="button"
                  className={[styles.sortBtn, sortActive ? styles.sortActive : ''].join(' ').trim()}
                  onClick={onSort}
                  aria-pressed={sortActive}
                  aria-label={`Sort: ${sortLabel}`}
                >
                  ↕ {sortLabel}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
