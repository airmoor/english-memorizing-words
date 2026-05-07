import styles from './Logo.module.css'

interface Props {
  /** Show the wordmark next to the SVG mark. Default true. */
  showWordmark?: boolean
  /** Visual size of the SVG mark in px. Wordmark scales with it. */
  size?: number
  className?: string
}

/**
 * Lexis logo.
 *
 * Mark: italic serif "L" flanked by two faded forward slashes — a visual pun
 * on phonetic transcription notation (`/lɛksɪs/`), tying the brand to the
 * dictionary domain. The wordmark sits to the right.
 *
 * Both the mark and the wordmark inherit `currentColor` so they pick up
 * whichever color the parent provides — typically the theme accent.
 */
export function Logo({ showWordmark = true, size = 28, className }: Props) {
  return (
    <span className={[styles.logo, className].filter(Boolean).join(' ')}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={styles.mark}
      >
        <text
          x="16"
          y="23"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="22"
          fontStyle="italic"
          fontWeight="500"
          fill="currentColor"
        >
          <tspan opacity="0.42">/</tspan>
          <tspan>L</tspan>
          <tspan opacity="0.42">/</tspan>
        </text>
      </svg>
      {showWordmark && (
        <span className={styles.wordmark}>Lexis</span>
      )}
    </span>
  )
}
