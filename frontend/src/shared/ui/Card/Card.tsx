import type { ElementType, HTMLAttributes, Ref } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLElement> {
  padding?: 'sm' | 'md' | 'lg'
  /** Adds hover lift + accent border — use for clickable/interactive list items */
  interactive?: boolean
  /**
   * glass    — translucent backdrop-filter surface; use selectively on primary
   *            hero/review cards where depth against the background matters.
   *            hero/review cards where depth against the background matters.
   * floating — opaque surface with elevated shadow + top-edge highlight;
   *            use for widgets, stat tiles, settings sections, list cards.
   */
  variant?: 'default' | 'glass' | 'floating' | 'flat'
  as?: ElementType
  /** React 19 supports ref as a plain prop — no forwardRef needed. */
  ref?: Ref<HTMLElement>
}

export function Card({
  padding = 'lg',
  interactive = false,
  variant = 'default',
  as: Tag = 'div',
  className = '',
  ref,
  ...props
}: CardProps) {
  const classes = [
    styles.card,
    styles[`padding-${padding}`],
    variant !== 'default' ? styles[variant] : '',
    interactive ? styles.interactive : '',
    className,
  ].filter(Boolean).join(' ')

  return <Tag ref={ref} className={classes} {...props} />
}
