/**
 * Icon — thin wrapper around Lucide icons.
 *
 * Centralises the three invariants that must be consistent across the whole UI:
 *   1. strokeWidth: 1.75  — lighter than Lucide's default 2, matches the app's
 *      "calm, minimal SaaS" aesthetic.
 *   2. aria-hidden: true  — icons are always decorative; a11y labels live on
 *      their parent button / link.
 *   3. flexShrink: 0      — prevents icons from squashing inside flex rows.
 *
 * Size conventions (pass `size` to override):
 *   Mobile nav tabs ........... 20
 *   Standard action icons ...... 18  (default)
 *   Toolbar / chip icons ....... 16
 *   Tiny inline icons .......... 14
 *
 * Secondary / less-important actions should pass `muted` to reduce
 * visual weight (opacity 0.65).
 *
 * Hover / press feedback lives on the parent button via the global
 * `.icon-action` CSS class defined in index.css — import it on any
 * button that contains only an icon (no text label).
 */

import type { LucideIcon, LucideProps } from 'lucide-react'

export interface IconProps extends Omit<LucideProps, 'ref' | 'size'> {
  /** The Lucide icon component to render. */
  icon: LucideIcon
  /**
   * Pixel size (width = height). Defaults to 18.
   * Use 20 for mobile nav tabs; 16 for dense toolbar items.
   */
  size?: number
  /**
   * Reduces opacity to 0.65 for secondary / less-important actions.
   * Primary CTA icons should leave this false (default).
   */
  muted?: boolean
}

export function Icon({
  icon: LucideComponent,
  size = 18,
  muted = false,
  style,
  ...props
}: IconProps) {
  return (
    <LucideComponent
      size={size}
      strokeWidth={1.75}
      aria-hidden="true"
      focusable="false"
      style={{
        flexShrink: 0,
        opacity: muted ? 0.65 : undefined,
        ...style,
      }}
      {...props}
    />
  )
}
