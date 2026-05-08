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
    <Card className={styles.card}>
      {/* Front */}
      <Stack gap="md">
        <Stack direction="row" gap="sm" align="center">
          {card.partOfSpeech && (
            <span className={styles.badge}>{card.partOfSpeech}</span>
          )}
          <span className={styles.count}>
            {card.meaningCount} meaning{card.meaningCount !== 1 ? 's' : ''}
          </span>
        </Stack>

        <Text variant="heading" className={styles.word}>{card.word}</Text>

        {card.transcription && (
          <Text variant="caption" color="secondary" className={styles.transcription}>
            {card.transcription}
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

      {/* Back */}
      {revealed && (
        <div className={styles.back}>
          {answerQuery.isPending && (
            <Text variant="caption" color="secondary">Loading…</Text>
          )}

          {answerQuery.data && (
            <Stack gap="sm">
              <Text variant="body">{answerQuery.data.definition}</Text>
              {answerQuery.data.examples.length > 0 && (
                <ul className={styles.examples}>
                  {answerQuery.data.examples.map((ex, i) => (
                    <li key={i}>
                      <Text variant="caption" color="secondary" as="span">"{ex}"</Text>
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          )}

          <RatingButtons
            onRate={(r) => rateMutation.mutate(r)}
            disabled={rateMutation.isPending}
          />

          {rateMutation.isError && (
            <Text variant="caption" color="danger" as="p" className={styles.errorMsg}>
              Failed to save. Try again.
            </Text>
          )}
        </div>
      )}
    </Card>
  )
}
