import { NavLink } from 'react-router-dom'
import styles from './MobileBottomNav.module.css'

/**
 * MobileBottomNav — fixed bottom tab bar for mobile devices (≤1023px).
 *
 * Rendered by PageLayout on every authenticated page.
 * Hidden via CSS on desktop — no JS matchMedia needed; CSS-only responsive.
 *
 * Four primary tabs: Home · Search · Vocab · Review.
 * Settings / logout live on the Settings page, reachable from the compact
 * mobile header's settings icon.
 *
 * Accessibility:
 * - role="navigation" + aria-label on the nav element
 * - Each NavLink has an aria-label matching its visible label
 * - Active state communicated via aria-current="page" (NavLink default)
 * - Touch targets ≥44px (height set in CSS)
 *
 * iOS safe area:
 * - padding-bottom: env(safe-area-inset-bottom) expands the bar to fill the
 *   iPhone home-indicator zone with the nav background.
 * - Tab items remain within the 56px visual zone above the safe area.
 */
export function MobileBottomNav() {
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <NavLink
        to="/home"
        className={({ isActive }) => [styles.tab, isActive ? styles.tabActive : ''].join(' ')}
        aria-label="Home"
      >
        <span className={styles.iconWrap} aria-hidden="true"><HomeIcon /></span>
        <span className={styles.label}>Home</span>
      </NavLink>

      <NavLink
        to="/search"
        className={({ isActive }) => [styles.tab, isActive ? styles.tabActive : ''].join(' ')}
        aria-label="Search"
      >
        <span className={styles.iconWrap} aria-hidden="true"><SearchIcon /></span>
        <span className={styles.label}>Search</span>
      </NavLink>

      <NavLink
        to="/vocabulary"
        className={({ isActive }) => [styles.tab, isActive ? styles.tabActive : ''].join(' ')}
        aria-label="Vocabulary"
      >
        <span className={styles.iconWrap} aria-hidden="true"><BookIcon /></span>
        <span className={styles.label}>Vocab</span>
      </NavLink>

      <NavLink
        to="/review"
        className={({ isActive }) => [styles.tab, isActive ? styles.tabActive : ''].join(' ')}
        aria-label="Review"
      >
        <span className={styles.iconWrap} aria-hidden="true"><ReviewIcon /></span>
        <span className={styles.label}>Review</span>
      </NavLink>
    </nav>
  )
}

// ── Tab icons ─────────────────────────────────────────────────────────────────
// Stroke-based, 24×24 viewBox. currentColor inherits from parent NavLink state.

function HomeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="5" width="20" height="15" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
