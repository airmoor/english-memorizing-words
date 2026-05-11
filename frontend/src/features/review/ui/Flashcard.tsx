import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAnswer } from '../api/getAnswer'
import { submitRating } from '../api/submitRating'
import type { NextCard, Rating } from '../../../entities/review/model/types'
import { Card } from '../../../shared/ui/Card/Card'
import { Button } from '../../../shared/ui/Button/Button'
import { Text } from '../../../shared/ui/Typography/Typography'
import { Stack } from '../../../shared/ui/Stack/Stack'
import { RatingButtons } from './RatingButtons'
import styles from './Flashcard.module.css'

interface Props {
  card: NextCard
}

export function Flashcard({ card }: Props) {
  const [revealed, setRevealed] = useState(false)
  const queryClient = useQueryClient()

  const answerQuery = useQuery({
    queryKey: ['answer', card.cardId],
    queryFn: () => getAnswer(card.cardId),
    enabled: revealed,
  })

  const rateMutation = useMutation({
    mutationFn: (rating: Rating) => submitRating(card.cardId, rating),
    onSuccess: () => {
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
            <Text variant="body" color="secondary" as="p" className={styles.example}>
              "{card.example}"
            </Text>
          )}

          {!revealed && (
            <Button fullWidth onClick={() => setRevealed(true)} className={styles.revealBtn}>
              Show answer
            </Button>
          )}
        </Stack>

        {/* Back — definitions only; rating buttons live below the card */}
        {revealed && (
          <div className={styles.back}>
            {answerQuery.isPending && (
              <Text variant="caption" color="secondary">Loading…</Text>
            )}

            {answerQuery.data && (
              <Stack gap="md">
                <ol className={styles.meanings}>
                  {answerQuery.data.meanings.map((m) => (
                    <li key={m.id} className={styles.meaning}>
                      <Stack gap="xs">
                        {m.partOfSpeech && (
                          <span className={styles.badge}>{m.partOfSpeech}</span>
                        )}
                        <Text variant="body" as="p" className={styles.definition}>{m.definition}</Text>
                        {m.examples.length > 0 && (
                          <ul className={styles.examples}>
                            {m.examples.map((ex, j) => (
                              <li key={j}>
                                <Text variant="caption" color="secondary" as="span">"{ex}"</Text>
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
        )}
      </Card>

      {/* Rating buttons sit below the card so they don't compete with content */}
      {revealed && (
        <RatingButtons
          onRate={(r) => rateMutation.mutate(r)}
          disabled={rateMutation.isPending}
        />
      )}
    </div>
  )
}
