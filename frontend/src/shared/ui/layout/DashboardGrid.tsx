import type { ReactNode } from 'react'
import styles from './DashboardGrid.module.css'

interface GridProps {
  children: ReactNode
  className?: string
}

interface CellProps {
  children: ReactNode
  /** 'full' spans all columns; 'auto' fills one column (default). */
  span?: 'full' | 'auto'
  className?: string
}

export function DashboardGrid({ children, className }: GridProps) {
  return (
    <div className={[styles.grid, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

export function DashboardCell({ children, span = 'auto', className }: CellProps) {
  return (
    <div className={[styles.cell, span === 'full' ? styles.full : '', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
