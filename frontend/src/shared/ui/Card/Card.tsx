import type { HTMLAttributes } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg'
}

export function Card({ padding = 'lg', className = '', ...props }: CardProps) {
  return (
    <div
      className={[styles.card, styles[`padding-${padding}`], className].join(' ')}
      {...props}
    />
  )
}
