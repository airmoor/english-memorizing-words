import { NavLink } from 'react-router-dom'
import { useLogout } from '../../../features/auth/model/useLogout'
import { useTheme } from '../../design/ThemeProvider'
import styles from './AppHeader.module.css'

export function AppHeader() {
  const logout = useLogout()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <NavLink
          to="/search"
          className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
        >
          Search
        </NavLink>
        <NavLink
          to="/vocabulary"
          className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
        >
          Vocabulary
        </NavLink>
        <NavLink
          to="/review"
          className={({ isActive }) => [styles.link, isActive ? styles.active : ''].join(' ')}
        >
          Review
        </NavLink>
      </nav>

      <div className={styles.actions}>
        <button
          onClick={toggleTheme}
          className={styles.themeToggle}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button onClick={logout} className={styles.logout}>
          Log out
        </button>
      </div>
    </header>
  )
}
