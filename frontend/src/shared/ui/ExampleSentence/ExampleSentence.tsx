import styles from './ExampleSentence.module.css'

interface Props {
  children: React.ReactNode
  /**
   * Apply 2-line clamp. Use in compact surfaces (MeaningPickerSheet)
   * where long examples would overflow the row.
   */
  truncate?: boolean
  /**
   * Suppress this instance's own accent bar and indent. Use when several
   * examples are wrapped in an `<ul>` that draws one shared bar for the
   * whole group instead — see `.examples` in Flashcard/Sense.
   */
  bare?: boolean
  className?: string
}

/**
 * Canonical example sentence container.
 *
 * Renders a block-level span with a left accent bar and italic text —
 * the editorial blockquote style from the Search / Vocabulary word detail view.
 *
 * The consumer is responsible for:
 * - List wrapping (if multiple examples, wrap in a `<ul>/<li>` structure and
 *   pass `bare` so the list can draw one shared bar instead of one per item)
 * - Quotation marks (&ldquo; / &rdquo;) around the example text
 * - Editorial note spans (e.g. from renderWithEditorialNotes in Sense.tsx)
 */
export function ExampleSentence({ children, truncate, bare, className }: Props) {
  return (
    <span
      className={[
        styles.example,
        truncate ? styles.truncate : '',
        bare ? styles.bare : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  )
}
