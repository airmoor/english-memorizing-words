import { NavLink, Link } from 'react-router-dom'
import { useLogout } from '../../../features/auth/model/useLogout'
import { Logo } from '../Logo/Logo'
import styles from './AppHeader.module.css'

const NAV_ITEMS: { to: string; label: string }[] = [
  { to: '/home',       label: 'Home' },
  { to: '/search',     label: 'Search' },
  { to: '/vocabulary', label: 'Vocabulary' },
  { to: '/review',     label: 'Review' },
]

export function AppHeader() {
  const logout = useLogout()

  return (
    <header className={styles.header}>
      <Link to="/home" className={styles.logoLink} aria-label="Lexis home">
        <Logo />
      </Link>

      <nav className={styles.nav} aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [styles.link, isActive ? styles.active : ''].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.actions}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [styles.iconButton, isActive ? styles.iconButtonActive : ''].join(' ')
          }
          aria-label="Settings"
          title="Settings"
        >
          <SettingsIcon />
        </NavLink>
        <button onClick={logout} className={styles.logout}>
          Log out
        </button>
      </div>
    </header>
  )
}

/** Inline gear icon — currentColor so it inherits theme. */
function SettingsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
