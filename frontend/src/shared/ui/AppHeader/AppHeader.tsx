import { Download, Settings, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { NavLink, Link } from '../../lib/navigation'
import { useNavigate } from '../../lib/useAppNavigate'
import { useLogout } from '../../../features/auth/model/useLogout'
import { Logo } from '../Logo/Logo'
import { usePwaInstall } from '../../pwa/usePwaInstall'
import { Icon } from '../Icon/Icon'
import { getTabHref, type TabPath } from '../../lib/lastTabPath'
import styles from './AppHeader.module.css'

const NAV_ITEMS: { to: TabPath; label: string }[] = [
  { to: '/home',       label: 'Home' },
  { to: '/search',     label: 'Search' },
  { to: '/vocabulary', label: 'Vocabulary' },
  { to: '/import',     label: 'Import' },
  { to: '/review',     label: 'Review' },
]

export function AppHeader() {
  const logout  = useLogout()
  const { canInstall, install, dismiss } = usePwaInstall()
  const location = useLocation()
  const navigate = useNavigate()

  const onSettings = () => {
    if (location.pathname === '/settings') {
      // If there's a previous entry in the session stack, go back; otherwise go home.
      // window.history.state.idx is populated by React Router's memory/browser history.
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
      if (idx > 0) {
        navigate(-1)
      } else {
        navigate('/home')
      }
    } else {
      navigate('/settings')
    }
  }

  const isOnSettings = location.pathname === '/settings'

  return (
    <header className={styles.header}>
      <Link to="/home" className={styles.logoLink} aria-label="Lexis home">
        <Logo />
      </Link>

      <nav className={styles.nav} aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={getTabHref(item.to)}
            className={({ isActive }) =>
              [styles.link, isActive ? styles.active : ''].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.actions}>
        {canInstall && (
          <div className={styles.installBadge} role="group" aria-label="Install Lexis app">
            <button onClick={install} className={styles.installBtn} title="Install Lexis">
              <Icon icon={Download} size={14} />
              <span className={styles.installLabel}>Install</span>
            </button>
            <button
              onClick={dismiss}
              className={[styles.installDismiss, 'icon-action'].join(' ')}
              aria-label="Dismiss install prompt"
            >
              <Icon icon={X} size={14} />
            </button>
          </div>
        )}
        <button
          onClick={onSettings}
          className={[styles.iconButton, isOnSettings ? styles.iconButtonActive : '', 'icon-action'].join(' ')}
          aria-label={isOnSettings ? 'Go back' : 'Settings'}
          title={isOnSettings ? 'Go back' : 'Settings'}
        >
          <Icon icon={Settings} size={18} />
        </button>
        <button onClick={logout} className={styles.logout}>
          Log out
        </button>
      </div>
    </header>
  )
}
