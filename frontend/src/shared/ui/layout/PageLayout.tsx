import type { ReactNode } from 'react'
import { AppHeader } from '../AppHeader/AppHeader'
import styles from './PageLayout.module.css'

interface Props {
  children: ReactNode
  /** Pass a local CSS class to extend the page wrapper (e.g. flex-column for scroll-fill layouts). */
  className?: string
}

export function PageLayout({ children, className }: Props) {
  return (
    <div className={[styles.page, className].filter(Boolean).join(' ')}>
      <AppHeader />
      {children}
    </div>
  )
}
