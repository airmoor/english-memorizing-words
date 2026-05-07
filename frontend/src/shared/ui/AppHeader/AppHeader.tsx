import { NavLink, Link } from 'react-router-dom'
import { useLogout } from '../../../features/auth/model/useLogout'
import { Logo } from '../Logo/Logo'
import { ThemePicker } from '../ThemePicker/ThemePicker'
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
        <ThemePicker />
        <button onClick={logout} className={styles.logout}>
          Log out
        </button>
      </div>
    </header>
  )
}
