import { useEffect, useRef, useState } from 'react'
import { useTheme, THEME_ORDER } from '../../design/ThemeProvider'
import styles from './ThemePicker.module.css'

/**
 * Dropdown theme picker.
 * Shows the current theme's icon as the trigger; opens a menu listing all
 * themes with their icons and labels. Click outside / ESC closes.
 */
export function ThemePicker() {
  const { theme, meta, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={`Theme: ${meta.label}. Click to change.`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={`Theme: ${meta.label}`}
      >
        <span aria-hidden>{meta.icon}</span>
      </button>

      {open && (
        <div role="menu" className={styles.menu}>
          <div className={styles.menuLabel}>Theme</div>
          {THEME_ORDER.map((t) => {
            const isCurrent = t.name === theme
            return (
              <button
                key={t.name}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                className={[styles.option, isCurrent ? styles.optionActive : ''].join(' ')}
                onClick={() => {
                  setTheme(t.name)
                  setOpen(false)
                }}
              >
                <span className={styles.optionIcon} aria-hidden>{t.icon}</span>
                <span className={styles.optionLabel}>{t.label}</span>
                {isCurrent && <span className={styles.check} aria-hidden>✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
