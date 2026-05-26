import { Home, Search, BookOpen, Upload, ClipboardCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Icon } from '../Icon/Icon'
import styles from './MobileBottomNav.module.css'

/**
 * MobileBottomNav — fixed bottom tab bar for mobile devices (≤1023px).
 *
 * Rendered by PageLayout on every authenticated page.
 * Hidden via CSS on desktop — no JS matchMedia needed; CSS-only responsive.
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
        <span className={styles.iconWrap} aria-hidden="true">
          <Icon icon={Home} size={20} />
        </span>
        <span className={styles.label}>Home</span>
      </NavLink>

      <NavLink
        to="/search"
        className={({ isActive }) => [styles.tab, isActive ? styles.tabActive : ''].join(' ')}
        aria-label="Search"
      >
        <span className={styles.iconWrap} aria-hidden="true">
          <Icon icon={Search} size={20} />
        </span>
        <span className={styles.label}>Search</span>
      </NavLink>

      <NavLink
        to="/vocabulary"
        className={({ isActive }) => [styles.tab, isActive ? styles.tabActive : ''].join(' ')}
        aria-label="Vocabulary"
      >
        <span className={styles.iconWrap} aria-hidden="true">
          <Icon icon={BookOpen} size={20} />
        </span>
        <span className={styles.label}>Vocab</span>
      </NavLink>

      <NavLink
        to="/import"
        className={({ isActive }) => [styles.tab, isActive ? styles.tabActive : ''].join(' ')}
        aria-label="Import"
      >
        <span className={styles.iconWrap} aria-hidden="true">
          <Icon icon={Upload} size={20} />
        </span>
        <span className={styles.label}>Import</span>
      </NavLink>

      <NavLink
        to="/review"
        className={({ isActive }) => [styles.tab, isActive ? styles.tabActive : ''].join(' ')}
        aria-label="Review"
      >
        <span className={styles.iconWrap} aria-hidden="true">
          <Icon icon={ClipboardCheck} size={20} />
        </span>
        <span className={styles.label}>Review</span>
      </NavLink>
    </nav>
  )
}
