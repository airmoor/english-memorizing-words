import type { ElementType, HTMLAttributes } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLElement> {
  padding?: 'sm' | 'md' | 'lg'
  /** Adds hover lift + accent border — use for clickable/interactive list items */
  interactive?: boolean
  /** glass: accent-subtle gradient background, for hero/highlight cards */
  variant?: 'default' | 'glass'
  as?: ElementType
}

export function Card({
  padding = 'lg',
  interactive = false,
  variant = 'default',
  as: Tag = 'div',
  className = '',
  ...props
}: CardProps) {
  const classes = [
    styles.card,
    styles[`padding-${padding}`],
    variant === 'glass' ? styles.glass : '',
    interactive ? styles.interactive : '',
    className,
  ].filter(Boolean).join(' ')

  return <Tag className={classes} {...props} />
}
