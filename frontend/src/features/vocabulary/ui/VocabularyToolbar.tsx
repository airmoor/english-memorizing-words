import { useRef } from 'react'
import { Search, X, List, AlignJustify } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
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
            <Icon icon={Search} size={16} />
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
              className={[styles.clearBtn, 'icon-action'].join(' ')}
              onClick={() => { onQueryChange(''); inputRef.current?.focus() }}
              aria-label="Clear search"
            >
              <Icon icon={X} size={14} />
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
              <Icon icon={List} size={16} />
            </button>
            <button
              className={[styles.viewBtn, viewMode === 'compact' ? styles.viewBtnActive : ''].join(' ')}
              onClick={() => onViewModeChange('compact')}
              aria-pressed={viewMode === 'compact'}
              title="Compact view"
            >
              <Icon icon={AlignJustify} size={16} />
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
