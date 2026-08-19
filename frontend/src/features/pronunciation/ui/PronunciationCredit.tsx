import { usePronunciation } from '../model/usePronunciation'
import type { PronunciationAccent } from '../api/pronunciationApi'
import styles from './PronunciationCredit.module.css'

interface Props {
  wordId: string
  /** Must match the accent the button plays, or the credit would name the
   *  wrong source. */
  accent?: PronunciationAccent
  className?: string
}

/**
 * Source credit for the pronunciation recording, rendered at the foot of the
 * word card.
 *
 * Not decoration: Merriam-Webster's free tier and Wiktionary's CC BY-SA both
 * require visible attribution wherever the audio is offered. It sits down here
 * rather than beside the transcription because a credit line in the headword
 * row forced the transcription to wrap on narrow screens.
 *
 * Renders nothing until the button has actually fetched a recording — passing
 * `enabled: false` means this component never issues a request of its own; it
 * just reads the cache entry the button filled under the same query key. No
 * audio, no attribution obligation, no markup.
 */
export function PronunciationCredit({
  wordId,
  accent = 'us',
  className,
}: Props) {
  const { data } = usePronunciation(wordId, accent, false)

  if (!data?.attribution) return null

  return (
    <p className={[styles.credit, className].filter(Boolean).join(' ')}>
      Pronunciation:{' '}
      {data.sourceRefUrl ? (
        <a
          href={data.sourceRefUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={styles.link}
        >
          {data.attribution}
        </a>
      ) : (
        data.attribution
      )}
    </p>
  )
}
