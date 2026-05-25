import type { ReactNode } from 'react'
import styles from './Container.module.css'

export type ContainerWidth = 'narrow' | 'default' | 'wide' | 'xl'

interface Props {
  children: ReactNode
  /**
   * Max-width preset:
   *   - narrow  (640px) — single-column reading, forms
   *   - default (880px) — most pages (dashboard, search, vocabulary, review)
   *   - wide    (1080px) — data-dense layouts (reserved for future settings/admin)
   */
  width?: ContainerWidth
  className?: string
  /** Extra vertical padding (default: --space-xl). Pass `none` to opt out. */
  padY?: 'none' | 'default'
  as?: 'div' | 'main' | 'section' | 'article'
}

/**
 * Centralised page container.
 *
 * Every authenticated page wraps its main content in this so all routes share
 * the same max-width and responsive horizontal padding (--page-padding-x).
 * Eliminates the layout "jump" that previously happened when navigating
 * between routes with bespoke max-widths.
 */
export function Container({
  children,
  width = 'default',
  className,
  padY = 'default',
  as: Tag = 'div',
}: Props) {
  const widthClass = styles[width]
  const padClass = padY === 'none' ? '' : styles.padY
  return (
    <Tag className={[styles.container, widthClass, padClass, className].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  )
}
