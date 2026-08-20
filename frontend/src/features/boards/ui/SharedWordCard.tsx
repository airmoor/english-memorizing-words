import { Card } from '../../../shared/ui/Card/Card'
import { Text } from '../../../shared/ui/Typography/Typography'
import { PosBadge } from '../../../shared/ui/PosBadge/PosBadge'
import type { SharedBoardWord } from '../../../entities/board/model/types'
import styles from '../../vocabulary/ui/VocabularyItem.module.css'

/**
 * Static, non-interactive word row for the public shared-board view.
 *
 * Deliberately not routed through VocabularyItem + useWordDetail(): that hook
 * throws by design outside a WordDetailProvider (see WordDetailContext.ts),
 * and the panel it opens is wired to the signed-in owner's own save/remove
 * actions — neither applies to an anonymous visitor previewing someone
 * else's board. Reuses VocabularyItem's CSS classes for visual consistency.
 */
export function SharedWordCard({ word }: { word: SharedBoardWord }) {
  return (
    <Card as="li" padding="sm" className={styles.item}>
      <div className={styles.main}>
        <div className={styles.wordRow}>
          <Text variant="label" as="span" className={styles.word}>
            {word.wordText}
          </Text>
          {word.transcription && (
            <span className={styles.transcription}>/{word.transcription}/</span>
          )}
        </div>

        {word.meanings.length > 0 && (
          <ul className={styles.meanings}>
            {word.meanings.slice(0, 3).map((m, i) => (
              <li key={i} className={styles.meaning}>
                {m.partOfSpeech && <PosBadge pos={m.partOfSpeech} />}
                <Text variant="caption" color="secondary" as="span" className={styles.definition}>
                  {m.definition}
                </Text>
              </li>
            ))}
            {word.meanings.length > 3 && (
              <li className={styles.moreCount}>
                <Text variant="caption" color="secondary" as="span">
                  +{word.meanings.length - 3} more
                </Text>
              </li>
            )}
          </ul>
        )}
      </div>
    </Card>
  )
}
