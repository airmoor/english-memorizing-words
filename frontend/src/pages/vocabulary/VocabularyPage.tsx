import { Spinner } from '../../shared/ui/Spinner'
import { Text } from '../../shared/ui/Typography/Typography'
import { Container } from '../../shared/ui/layout/Container'
import { PageLayout } from '../../shared/ui/layout/PageLayout'
import { WordDetailProvider } from '../../shared/ui/WordDetail/WordDetailProvider'
import { useWordDetail } from '../../shared/ui/WordDetail/WordDetailContext'
import { useWordDetailUrl } from '../../shared/ui/WordDetail/useWordDetailUrl'
import { VocabularyList } from '../../features/vocabulary/ui/VocabularyList'
import { useVocabulary } from '../../features/vocabulary/model/useVocabulary'
import type { VocabularyWord } from '../../entities/vocabulary/model/types'
import styles from './VocabularyPage.module.css'

// ── Inner component — inside WordDetailProvider, has access to useWordDetail ──

interface ContentProps {
  items: VocabularyWord[]
  onRemove: (wordId: string) => void
}

/**
 * Inner content component. Lives inside WordDetailProvider so it can call
 * useWordDetail() and useWordDetailUrl() (which both require provider context).
 */
function VocabularyPageContent({ items, onRemove }: ContentProps) {
  const detail = useWordDetail()

  // Sync detail panel state with ?word= URL param (§8)
  useWordDetailUrl({
    detail,
    vocabularyItems: items,
    open: detail.open,
    close: detail.close,
  })

  return <VocabularyList items={items} onRemove={onRemove} />
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function VocabularyPage() {
  const { items, isLoading, isError, remove } = useVocabulary()

  return (
    <PageLayout>
      {/*
       * width="wide" (1080px) accommodates the desktop split-view:
       * list column (420px) + gap (48px) + panel column (≈516px) = 984px.
       * The wider container is only visually meaningful when the SidePanel is
       * open; when closed the list renders normally at its natural width.
       */}
      <Container as="main" width="wide">
        <div className={styles.pageHeader}>
          <Text variant="title" as="h1" className={styles.heading}>
            My Vocabulary
          </Text>

          {/*
           * Word count sits ABOVE the WordDetailProvider grid so the list
           * column and the detail panel both start at the same Y position —
           * the top of the first vocabulary item (not the word-count label).
           * This satisfies the "panel aligns with first list card" requirement.
           */}
          {!isLoading && !isError && items.length > 0 && (
            <Text variant="body" color="secondary" as="p" className={styles.wordCount}>
              {items.length} word{items.length !== 1 ? 's' : ''}
            </Text>
          )}
        </div>

        {isLoading && <Spinner />}

        {isError && (
          <Text variant="body" color="secondary" as="p">
            Failed to load vocabulary. Please try again.
          </Text>
        )}

        {/*
         * WordDetailProvider wraps the list so VocabularyItem rows can open the
         * panel via useWordDetail(). context="vocabulary" activates the close ×
         * button in DictionaryHeader (replaces the "Saved ✓" badge).
         */}
        {!isLoading && !isError && (
          <WordDetailProvider onRemove={remove} context="vocabulary">
            <VocabularyPageContent items={items} onRemove={remove} />
          </WordDetailProvider>
        )}
      </Container>
    </PageLayout>
  )
}
