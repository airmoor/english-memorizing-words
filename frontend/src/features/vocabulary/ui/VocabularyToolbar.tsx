import { useRef } from 'react'
import styles from './VocabularyToolbar.module.css'

export type ViewMode = 'detailed' | 'compact'

interface Props {
  query: string
  viewMode: ViewMode
  onQueryChange: (q: string) => void
  onViewModeChange: (m: ViewMode) => void
}

export function VocabularyToolbar({
  query,
  viewMode,
  onQueryChange,
  onViewModeChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

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

    </div>
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
