import { useNavigate } from 'react-router-dom'
import { useMemo, useState, useEffect, useRef } from 'react'
import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
import { Text } from '../../../shared/ui/Typography/Typography'
import { Button } from '../../../shared/ui/Button/Button'
import { VocabularyItem } from './VocabularyItem'
import { VocabularyItemCompact } from './VocabularyItemCompact'
import type { ViewMode } from './VocabularyToolbar'
import styles from './VocabularyList.module.css'

const PAGE_SIZE = 50

interface Props {
  items: VocabularyWord[]
  onRemove: (wordId: string) => void
  viewMode?: ViewMode
  /** When true, shows the empty-vocab prompt (all words gone). When false + empty, it means filters excluded everything. */
  isEmpty?: boolean
}

export function VocabularyList({ items, onRemove, viewMode = 'detailed', isEmpty = false }: Props) {
  const navigate = useNavigate()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset pagination whenever the filtered list changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [items])

  // Intersection-observer auto-load-more — fires when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, items.length))
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [items.length])

  // Source list for panel navigation — reflects the current filtered + sorted order
  const sourceList = useMemo(() => items.map((item) => item.wordId), [items])

  // Slice to the current page window
  const visibleItems = items.slice(0, visibleCount)

  // ── Empty: no words saved at all ─────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📚</span>
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

  // ── Empty: filters excluded everything ────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>🔍</span>
        <Text variant="title" as="h3" className={styles.emptyTitle}>
          No matches
        </Text>
        <Text variant="body" color="secondary" as="p" className={styles.emptyText}>
          Try a different search or filter combination.
        </Text>
      </div>
    )
  }

  return (
    <div>
      <ul className={viewMode === 'compact' ? styles.listCompact : styles.list}>
        {visibleItems.map((item) =>
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

      {/* Intersection sentinel — triggers next batch load when scrolled into view */}
      {visibleCount < items.length && (
        <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
      )}
    </div>
  )
}
