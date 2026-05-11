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
      <Container as="main" width="wide">
        <Text variant="title" as="h1" className={styles.heading}>
          My Vocabulary
        </Text>

        {isLoading && <Spinner />}

        {isError && (
          <Text variant="body" color="secondary" as="p">
            Failed to load vocabulary. Please try again.
          </Text>
        )}

        {/*
         * WordDetailProvider wraps the list so VocabularyItem rows can open the
         * panel via useWordDetail(). WordDetailContainer mounts one BottomSheet
         * or SidePanel for the entire page. Container width is "wide" (1080px)
         * to comfortably accommodate list (700px) + panel (380px).
         */}
        {!isLoading && !isError && (
          <WordDetailProvider onRemove={remove}>
            <VocabularyPageContent items={items} onRemove={remove} />
          </WordDetailProvider>
        )}
      </Container>
    </PageLayout>
  )
}
