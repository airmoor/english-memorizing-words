import type { ReactNode } from 'react'
import { AppHeader } from '../AppHeader/AppHeader'
import { MobileBottomNav } from '../AppHeader/MobileBottomNav'
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
      {/*
       * MobileBottomNav is fixed to the bottom of the viewport.
       * It is CSS-hidden on desktop (display:none at ≥1024px) so no JS
       * matchMedia is needed. Page content is padded in PageLayout.module.css
       * to prevent the last content from being obscured by the bar.
       */}
      <MobileBottomNav />
    </div>
  )
}
