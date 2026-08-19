import { useNavigate } from 'react-router-dom'
import { useMemo, useEffect, useRef } from 'react'
import { Folder, Library, Search } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
import { Text } from '../../../shared/ui/Typography/Typography'
import { Button } from '../../../shared/ui/Button/Button'
import { Spinner } from '../../../shared/ui/Spinner'
import { VocabularyItem } from './VocabularyItem'
import { VocabularyItemCompact } from './VocabularyItemCompact'
import type { ViewMode } from './VocabularyToolbar'
import styles from './VocabularyList.module.css'

interface Props {
  items: VocabularyWord[]
  onRemove: (wordId: string) => void
  viewMode?: ViewMode
  /** True when the user has no words at all (not filtered out). */
  isEmpty?: boolean
  /** True when the selected board itself has zero words (distinct from a filter matching nothing). */
  isEmptyBoard?: boolean
  /** True when at least one filter is active (board, tag, reviewState, etc.) */
  hasActiveFilters?: boolean
  /** The committed text search query, if any — used to offer a dictionary bridge on zero matches. */
  searchQuery?: string
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
  /** Called when user clicks "Clear filters" from the empty filtered state */
  onClearFilters?: () => void
  /** Called when user clicks "Go to All Vocabulary" from the empty-board state */
  onGoToAllVocabulary?: () => void
}

export function VocabularyList({
  items,
  onRemove,
  viewMode = 'detailed',
  isEmpty = false,
  isEmptyBoard = false,
  hasActiveFilters = false,
  searchQuery = '',
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  onClearFilters,
  onGoToAllVocabulary,
}: Props) {
  const navigate    = useNavigate()
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Trigger onLoadMore when the sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage || !onLoadMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          onLoadMore()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  // Source list for panel navigation — ordered by current view
  const sourceList = useMemo(() => items.map((item) => item.wordId), [items])

  // ── Empty: no words saved at all ─────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}><Icon icon={Library} size={32} muted /></span>
        <Text variant="title" as="h3" className={styles.emptyTitle}>
          No words saved yet
        </Text>
        <Text variant="body" color="secondary" as="p" className={styles.emptyText}>
          Search for English words and save them to build your vocabulary.
        </Text>
        <Button onClick={() => navigate('/search')} variant="secondary">
          Go to Search
        </Button>
      </div>
    )
  }

  // ── Empty: board selected has genuinely zero words ─────────────────────────
  // Distinct from the filter-matched-nothing case below — a brand-new board
  // isn't "no matches," it's just not populated yet.
  if (isEmptyBoard) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}><Icon icon={Folder} size={32} muted /></span>
        <Text variant="title" as="h3" className={styles.emptyTitle}>
          This board is empty
        </Text>
        <Text variant="body" color="secondary" as="p" className={styles.emptyText}>
          Add words from your vocabulary using the board icon on any word.
        </Text>
        {onGoToAllVocabulary && (
          <Button onClick={onGoToAllVocabulary} variant="secondary">
            Go to All Vocabulary
          </Button>
        )}
      </div>
    )
  }

  // ── Empty: filters excluded everything ────────────────────────────────────
  if (items.length === 0) {
    // A text query with zero hits means the word isn't in *your* vocabulary —
    // not that it doesn't exist. Bridge to the dictionary instead of a dead end.
    const trimmedQuery = searchQuery.trim()

    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}><Icon icon={Search} size={32} muted /></span>
        <Text variant="title" as="h3" className={styles.emptyTitle}>
          No matches
        </Text>
        <Text variant="body" color="secondary" as="p" className={styles.emptyText}>
          {trimmedQuery
            ? `"${trimmedQuery}" isn't in your saved words.`
            : hasActiveFilters
              ? 'No words match these filters. Try adjusting or clearing them.'
              : 'Try a different search term.'}
        </Text>
        {trimmedQuery ? (
          <Button
            onClick={() => navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`)}
            variant="secondary"
          >
            Search the dictionary for &ldquo;{trimmedQuery}&rdquo;
          </Button>
        ) : (
          hasActiveFilters && onClearFilters && (
            <Button onClick={onClearFilters} variant="secondary">
              Clear filters
            </Button>
          )
        )}
      </div>
    )
  }

  return (
    <div>
      <ul className={viewMode === 'compact' ? styles.listCompact : styles.list}>
        {items.map((item) =>
          viewMode === 'compact' ? (
            <VocabularyItemCompact
              key={item.wordId}
              item={item}
              onRemove={onRemove}
              sourceList={sourceList}
            />
          ) : (
            <VocabularyItem
              key={item.wordId}
              item={item}
              onRemove={onRemove}
              sourceList={sourceList}
            />
          ),
        )}
      </ul>

      {/* Sentinel — triggers backend fetch of next page */}
      {hasNextPage && (
        <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
      )}
      {isFetchingNextPage && <Spinner />}
    </div>
  )
}
