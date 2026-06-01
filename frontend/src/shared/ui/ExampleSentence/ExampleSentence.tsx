import styles from './ExampleSentence.module.css'

interface Props {
  children: React.ReactNode
  /**
   * Apply 2-line clamp. Use in compact surfaces (MeaningPickerSheet)
   * where long examples would overflow the row.
   */
  truncate?: boolean
  className?: string
}

/**
 * Canonical example sentence container.
 *
 * Renders a block-level span with a left accent bar and italic text —
 * the editorial blockquote style from the Search / Vocabulary word detail view.
 *
 * The consumer is responsible for:
 * - List wrapping (if multiple examples, wrap in a `<ul>/<li>` structure)
 * - Quotation marks (&ldquo; / &rdquo;) around the example text
 * - Editorial note spans (e.g. from renderWithEditorialNotes in Sense.tsx)
 */
export function ExampleSentence({ children, truncate, className }: Props) {
  return (
    <span
      className={[
        styles.example,
        truncate ? styles.truncate : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  )
}
