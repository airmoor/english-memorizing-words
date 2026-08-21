import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, AlertTriangle } from 'lucide-react'
import { Icon } from '../../shared/ui/Icon/Icon'
import { Spinner } from '../../shared/ui/Spinner'
import { Crossfade } from '../../shared/ui/Crossfade/Crossfade'
import { Text } from '../../shared/ui/Typography/Typography'
import { SearchBar } from '../../features/word-search/ui/SearchBar'
import { WordEntry } from '../../features/word-search/ui/WordEntry'
import { Container } from '../../shared/ui/layout/Container'
import { PageLayout } from '../../shared/ui/layout/PageLayout'
import { useWordSearch } from '../../features/word-search/model/useWordSearch'
import { useWordSuggestions, SUGGESTION_COUNT } from '../../features/word-search/model/useWordSuggestions'
import styles from './SearchPage.module.css'

function normalizeText(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function SearchPage() {
  // The ?q= param is the single source of truth for the committed (debounced)
  // query, same pattern as VocabularyPage — this is what lets switching tabs
  // and back restore the last search instead of always landing blank.
  const [searchParams, setSearchParams] = useSearchParams()
  const query = normalizeText(searchParams.get('q') ?? '')

  const [input, setInput] = useState(query)

  // "setState during render" sync: when the URL's ?q= changes from an
  // external source (back/forward nav, a chip click, "see also"), update
  // the input to match without going through an effect.
  const [prevQuery, setPrevQuery] = useState(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    setInput(query)
  }

  const commitQuery = useCallback((next: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next) params.set('q', next)
      else params.delete('q')
      return params
    }, { replace: true })
  }, [setSearchParams])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function handleInputChange(value: string) {
    setInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => commitQuery(normalizeText(value)), 300)
  }

  function handleSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    commitQuery(normalizeText(input))
  }

  function jumpTo(word: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setInput(word)
    commitQuery(normalizeText(word))
  }

  const searchState = useWordSearch(query)
  const suggestions = useWordSuggestions(searchState.status === 'idle')

  return (
    <PageLayout className={styles.flexPage}>
      <Container as="main">
        <div className={styles.content}>
          {/* Search bar — always visible at top */}
          <div className={styles.searchWrap}>
            <SearchBar
              value={input}
              onChange={handleInputChange}
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
                <Crossfade
                  ready={suggestions !== null}
                  fallback={
                    <div className={styles.chipsRow} aria-hidden="true">
                      {Array.from({ length: SUGGESTION_COUNT }, (_, i) => (
                        <span key={i} className={styles.chipSkeleton} />
                      ))}
                    </div>
                  }
                >
                  <div className={styles.chipsRow}>
                    {(suggestions ?? []).map((word) => (
                      <button
                        key={word}
                        className={styles.chip}
                        onClick={() => jumpTo(word)}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </Crossfade>
              </div>
            )}

            {searchState.status === 'loading' && (
              <Spinner />
            )}

            {searchState.status === 'notFound' && (
              <div className={[styles.emptyState, 'content-fade-in'].join(' ')}>
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
              <div className={[styles.emptyState, 'content-fade-in'].join(' ')}>
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
              <div className={[styles.emptyState, 'content-fade-in'].join(' ')}>
                <span className={styles.emptyIcon}>
                  <Icon icon={AlertTriangle} size={32} muted />
                </span>
                <Text variant="body" color="danger" as="p">
                  {searchState.message}
                </Text>
              </div>
            )}

            {searchState.status === 'success' && (
              <div className="content-fade-in">
                <WordEntry
                  word={searchState.word}
                  onSeeAlso={jumpTo}
                />
              </div>
            )}
          </div>
        </div>
      </Container>
    </PageLayout>
  )
}
