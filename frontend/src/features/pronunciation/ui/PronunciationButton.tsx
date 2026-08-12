import { useEffect, useRef, useState } from 'react'
import { Volume2, Loader2, VolumeX } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { usePronunciation } from '../model/usePronunciation'
import type { PronunciationAccent } from '../api/pronunciationApi'
import styles from './PronunciationButton.module.css'

interface Props {
  wordId: string
  /** Headword — used only for the accessible label. */
  word: string
  /** Accent to play. Defaults to US (the app-wide default). */
  accent?: PronunciationAccent
}

/**
 * A 44-byte silent WAV. Played once inside the click handler to satisfy the
 * browser's autoplay policy — see `unlockAudio` below.
 */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

/**
 * Speaker button that plays a word's pronunciation.
 *
 * Lazy: the audio URL is fetched from the backend only on the first click. Once
 * loaded it is cached by react-query, so replays are instant and hit the CDN
 * directly. States: idle → loading → playing, plus "unavailable" (the word has
 * no recording anywhere) and "error" (fetch or playback failed; clicking
 * retries).
 *
 * Licensing: when the backend reports an `attribution`, it is rendered next to
 * the button. Merriam-Webster's free tier and Wiktionary's CC BY-SA both
 * require visible credit, so this is not optional chrome.
 */
export function PronunciationButton({ wordId, word, accent = 'us' }: Props) {
  const [activated, setActivated] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [playbackFailed, setPlaybackFailed] = useState(false)
  const wantPlayRef = useRef(false)
  const unlockedRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const query = usePronunciation(wordId, accent, activated)

  /**
   * One <audio> element for the lifetime of the button. Reusing it (rather than
   * constructing a new Audio per URL) is what makes the autoplay unlock below
   * stick: user activation is granted to an element, not to the page.
   */
  function ensureAudio(): HTMLAudioElement {
    let audio = audioRef.current
    if (!audio) {
      audio = new Audio()
      audio.preload = 'auto'
      audio.addEventListener('ended', () => setPlaying(false))
      audio.addEventListener('error', () => {
        setPlaying(false)
        // An error on the silent unlock clip is expected noise, not a failure
        // the user should ever see.
        if (audio!.src !== SILENT_WAV) setPlaybackFailed(true)
      })
      audioRef.current = audio
    }
    return audio
  }

  /**
   * Browsers only allow playback that originates from a user gesture. On a cold
   * click the URL is not known yet, so the real `play()` happens after an await
   * — outside the gesture window — and iOS Safari in particular rejects it.
   *
   * Playing a silent clip synchronously inside the handler marks the element as
   * user-activated, after which deferred playback on that same element is
   * allowed. Failures are swallowed: the worst case is the behaviour we already
   * had before this workaround.
   */
  function unlockAudio(audio: HTMLAudioElement) {
    if (unlockedRef.current) return
    unlockedRef.current = true
    audio.src = SILENT_WAV
    void audio
      .play()
      .then(() => audio.pause())
      .catch(() => {})
  }

  function play(url: string) {
    const audio = ensureAudio()
    setPlaybackFailed(false)
    if (audio.src !== url) audio.src = url
    audio.currentTime = 0
    setPlaying(true)
    void audio.play().catch(() => {
      setPlaying(false)
      setPlaybackFailed(true)
    })
  }

  // Play once the URL arrives, if a play was requested while it was loading.
  useEffect(() => {
    if (!wantPlayRef.current) return
    // A 404 resolves to null — drop the pending request rather than leaving the
    // flag armed for a play that will never come.
    if (query.data === null) {
      wantPlayRef.current = false
      return
    }
    if (!query.data?.audioUrl) return
    wantPlayRef.current = false
    play(query.data.audioUrl)
  }, [query.data])

  // Stop and release the audio element on unmount.
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  function handleClick() {
    const audio = ensureAudio()

    if (query.data?.audioUrl) {
      play(query.data.audioUrl)
      return
    }

    // Cold path: unlock now, while we still hold the gesture.
    unlockAudio(audio)
    wantPlayRef.current = true
    setPlaybackFailed(false)
    if (!activated) setActivated(true) // first click → fetch
    else void query.refetch() // retry after a transient failure
  }

  const loading = activated && query.isFetching
  // A genuine 404 (data === null) means there is no pronunciation for this word.
  const unavailable = query.data === null && !query.isFetching
  const failed = (query.isError || playbackFailed) && !loading

  const icon = loading ? Loader2 : unavailable ? VolumeX : Volume2

  const label = unavailable
    ? `No pronunciation available for ${word}`
    : failed
      ? `Pronunciation of ${word} failed to load — activate to retry`
      : `Play pronunciation of ${word}`

  const attribution = query.data?.attribution
  const sourceRefUrl = query.data?.sourceRefUrl

  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        className={[
          styles.button,
          'icon-action',
          loading ? styles.spinning : '',
          playing ? styles.playing : '',
          failed ? styles.failed : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={handleClick}
        disabled={loading || unavailable}
        aria-label={label}
        title={
          unavailable
            ? 'Pronunciation unavailable'
            : failed
              ? 'Could not play — click to retry'
              : 'Play pronunciation'
        }
      >
        <Icon icon={icon} size={16} />
      </button>

      {/* Required by the source licenses whenever the recording is available. */}
      {attribution && (
        <span className={styles.credit}>
          {sourceRefUrl ? (
            <a
              href={sourceRefUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={styles.creditLink}
            >
              {attribution}
            </a>
          ) : (
            attribution
          )}
        </span>
      )}
    </span>
  )
}
