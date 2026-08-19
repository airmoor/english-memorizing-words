import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, AlertTriangle } from 'lucide-react'
import { Icon } from '../../shared/ui/Icon/Icon'
import { Spinner } from '../../shared/ui/Spinner'
import { Text } from '../../shared/ui/Typography/Typography'
import { SearchBar } from '../../features/word-search/ui/SearchBar'
import { WordEntry } from '../../features/word-search/ui/WordEntry'
import { Container } from '../../shared/ui/layout/Container'
import { PageLayout } from '../../shared/ui/layout/PageLayout'
import { useWordSearch } from '../../features/word-search/model/useWordSearch'
import styles from './SearchPage.module.css'

function normalizeText(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function SearchPage() {
  // Seed from ?q= so links from elsewhere in the app (e.g. "search the
  // dictionary for X" from an empty Vocabulary search) land pre-filled
  // instead of on a blank box the visitor has to retype into.
  const [searchParams] = useSearchParams()
  const initialQuery = normalizeText(searchParams.get('q') ?? '')

  const [input, setInput] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)

  // Debounce input → query (300 ms)
  useEffect(() => {
    const id = setTimeout(() => {
      const normalized = normalizeText(input)
      if (normalized !== query) setQuery(normalized)
    }, 300)
    return () => clearTimeout(id)
  }, [input, query])

  function handleSearch() {
    const normalized = normalizeText(input)
    setQuery(normalized)
  }

  const searchState = useWordSearch(query)

  return (
    <PageLayout className={styles.flexPage}>
      <Container as="main">
        <div className={styles.content}>
          {/* Search bar — always visible at top */}
          <div className={styles.searchWrap}>
            <SearchBar
              value={input}
              onChange={setInput}
              onSearch={handleSearch}
              disabled={searchState.status === 'loading'}
            />
          </div>

          {/* State-driven result area */}
          <div className={styles.results}>
            {searchState.status === 'idle' && (
              <div className={styles.idleState}>
                <p className={styles.idleHeading}>Look up any word</p>
                <p className={styles.idleSubtext}>Meanings, transcription, and usage examples</p>
                <p className={styles.chipsLabel}>Try these words</p>
                <div className={styles.chipsRow}>
                  {['ephemeral', 'serendipity', 'ambiguous', 'resilient', 'eloquent'].map((word) => (
                    <button
                      key={word}
                      className={styles.chip}
                      onClick={() => {
                        setInput(word)
                        setQuery(normalizeText(word))
                      }}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchState.status === 'loading' && (
              <Spinner />
            )}

            {searchState.status === 'notFound' && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>
                  <Icon icon={Search} size={32} muted />
                </span>
                <Text variant="title" as="h3" className={styles.stateTitle}>
                  Word not found
                </Text>
                <Text variant="body" color="secondary" as="p">
                  "{query}" isn't in the dictionary. Check the spelling and try again.
                </Text>
              </div>
            )}

            {searchState.status === 'unavailable' && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>
                  <Icon icon={AlertTriangle} size={32} muted />
                </span>
                <Text variant="title" as="h3" className={styles.stateTitle}>
                  Dictionary unavailable
                </Text>
                <Text variant="body" color="secondary" as="p">
                  The dictionary service is temporarily unavailable. Please try again in a moment.
                </Text>
              </div>
            )}

            {searchState.status === 'error' && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>
                  <Icon icon={AlertTriangle} size={32} muted />
                </span>
                <Text variant="body" color="danger" as="p">
                  {searchState.message}
                </Text>
              </div>
            )}

            {searchState.status === 'success' && (
              <WordEntry
                word={searchState.word}
                onSeeAlso={(term) => {
                  setInput(term)
                  setQuery(normalizeText(term))
                }}
              />
            )}
          </div>
        </div>
      </Container>
    </PageLayout>
  )
}
