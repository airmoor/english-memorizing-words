import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AppHeader } from '../AppHeader/AppHeader'
import { MobileBottomNav } from '../AppHeader/MobileBottomNav'
import styles from './PageLayout.module.css'

interface Props {
  children: ReactNode
  /** Pass a local CSS class to extend the page wrapper (e.g. flex-column for scroll-fill layouts). */
  className?: string
}

export function PageLayout({ children, className }: Props) {
  // Re-key the content wrapper on each route change so the enter animation
  // replays. Keyed by pathname only (not search params), so opening a word
  // panel or changing filters on the same page doesn't re-trigger the fade.
  // The header and bottom nav sit outside this wrapper and stay put — only the
  // page content crossfades, which keeps the shell stable and the motion calm.
  const { pathname } = useLocation()

  return (
    <div className={[styles.page, className].filter(Boolean).join(' ')}>
      <AppHeader />
      {/* key=pathname remounts the scroll container on navigation so its fade-in
          animation (PageLayout.module.css) replays. No extra wrapper element —
          children stay direct descendants of .content, preserving every page's
          height/flex layout. */}
      <div key={pathname} className={styles.content}>{children}</div>
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
