import { forwardRef } from 'react'
import {
  Link as RouterLink,
  NavLink as RouterNavLink,
  type LinkProps,
  type NavLinkProps,
} from 'react-router-dom'

/**
 * Drop-in replacements for react-router's `Link` and `NavLink` that default
 * `viewTransition` to on. That option wraps the route change in
 * `document.startViewTransition()`, so the outgoing page cross-fades into the
 * incoming one instead of hard-cutting. Routing through these everywhere (vs.
 * opting in per call site) keeps every navigation in the app animating the
 * same way — tab clicks, CTA buttons, back links — rather than some being
 * smooth and others not. See also useAppNavigate for the programmatic
 * equivalent. Requires the data router (see AppRouter.tsx); browsers without
 * the View Transitions API silently fall back to an instant swap.
 */

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(props, ref) {
  return <RouterLink viewTransition ref={ref} {...props} />
})

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(props, ref) {
  return <RouterNavLink viewTransition ref={ref} {...props} />
})
