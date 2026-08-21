import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import styles from './RowActionMenu.module.css'

export interface RowActionMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface Props {
  items: RowActionMenuItem[]
  ariaLabel: string
  /** Sizing/box styling — supplied by the caller so the trigger matches its row's other icon buttons. */
  triggerClassName?: string
  iconSize?: number
}

/**
 * Icon-triggered overflow menu for secondary row actions (e.g. a destructive
 * action kept out of the row's always-visible icons). Same portal / outside-click
 * / Escape mechanics as SelectMenu, simplified for a plain action list (no
 * selected-value state).
 */
export function RowActionMenu({ items, ariaLabel, triggerClassName = '', iconSize = 15 }: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})

  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
      zIndex: 200,
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={[styles.trigger, triggerClassName].join(' ').trim()}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <Icon icon={MoreVertical} size={iconSize} muted />
      </button>

      {open &&
        createPortal(
          <div ref={menuRef} className={styles.menu} style={menuStyle} role="menu" aria-label={ariaLabel}>
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={[styles.item, item.danger ? styles.itemDanger : ''].join(' ').trim()}
                onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick() }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
