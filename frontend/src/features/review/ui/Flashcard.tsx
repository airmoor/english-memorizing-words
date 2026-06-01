import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAnswer } from '../api/getAnswer'
import { submitRating } from '../api/submitRating'
import type { NextCard, Rating } from '../../../entities/review/model/types'
import { Card } from '../../../shared/ui/Card/Card'
import { Button } from '../../../shared/ui/Button/Button'
import { Text } from '../../../shared/ui/Typography/Typography'
import { Stack } from '../../../shared/ui/Stack/Stack'
import { PosBadge } from '../../../shared/ui/PosBadge/PosBadge'
import { ExampleSentence } from '../../../shared/ui/ExampleSentence/ExampleSentence'
import { RatingButtons } from './RatingButtons'
import styles from './Flashcard.module.css'

interface Props {
  card: NextCard
  /** Called after a rating is successfully submitted — lets the parent track session counts */
  onRated?: (rating: Rating) => void
}

export function Flashcard({ card, onRated }: Props) {
  const [revealed, setRevealed] = useState(false)
  const queryClient = useQueryClient()

  const answerQuery = useQuery({
    queryKey: ['answer', card.cardId],
    queryFn: () => getAnswer(card.cardId),
    enabled: revealed,
  })

  const rateMutation = useMutation({
    mutationFn: (rating: Rating) => submitRating(card.cardId, rating),
    onSuccess: (_data, rating) => {
      onRated?.(rating)
      queryClient.invalidateQueries({ queryKey: ['nextCard'] })
      queryClient.invalidateQueries({ queryKey: ['progress'] })
    },
  })

  return (
    <div className={styles.wrapper}>
      <Card variant="glass" className={styles.card}>
        {/* Front */}
        <Stack gap="md">
          <Text variant="heading" className={styles.word}>{card.word}</Text>

          {card.transcription && (
            <Text variant="caption" color="secondary" className={styles.transcription}>
              /{card.transcription}/
            </Text>
          )}

          {card.example && (
            <ExampleSentence>&ldquo;{card.example}&rdquo;</ExampleSentence>
          )}

          {!revealed && (
            <Button fullWidth onClick={() => setRevealed(true)} className={styles.revealBtn}>
              Show answer
            </Button>
          )}
        </Stack>

        {/* Back — always rendered; CSS grid collapses/expands it smoothly.
            The inner element has overflow:hidden so collapsed state is invisible. */}
        <div className={[styles.answerSlot, revealed ? styles.answerSlotOpen : ''].join(' ')}>
          <div className={styles.answerInner}>
            <div className={styles.back}>
              {answerQuery.isPending && revealed && (
                <Text variant="caption" color="secondary">Loading…</Text>
              )}

              {answerQuery.data && (
                <Stack gap="md">
                  <ol className={styles.meanings}>
                    {answerQuery.data.meanings.map((m) => (
                      <li key={m.id} className={styles.meaning}>
                        <Stack gap="xs">
                          {m.partOfSpeech && (
                            <PosBadge pos={m.partOfSpeech} />
                          )}
                          <Text variant="body" as="p" className={styles.definition}>{m.definition}</Text>
                          {m.examples.length > 0 && (
                            <ul className={styles.examples}>
                              {m.examples.map((ex, j) => (
                                <li key={j}>
                                  <ExampleSentence>&ldquo;{ex}&rdquo;</ExampleSentence>
                                </li>
                              ))}
                            </ul>
                          )}
                          {m.synonyms.length > 0 && (
                            <div className={styles.synonyms}>
                              {m.synonyms.map((s) => (
                                <span key={s} className={styles.synonym}>{s}</span>
                              ))}
                            </div>
                          )}
                        </Stack>
                      </li>
                    ))}
                  </ol>
                </Stack>
              )}

              {rateMutation.isError && (
                <Text variant="caption" color="danger" as="p" className={styles.errorMsg}>
                  Failed to save. Try again.
                </Text>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Rating buttons sit below the card and animate in after the reveal */}
      {revealed && (
        <div className={styles.ratingSlot}>
          <RatingButtons
            onRate={(r) => rateMutation.mutate(r)}
            disabled={rateMutation.isPending}
            previews={answerQuery.data?.nextReviewPreviews}
          />
        </div>
      )}
    </div>
  )
}
