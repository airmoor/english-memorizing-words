import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import styles from './SelectMenu.module.css'

export interface SelectMenuOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: SelectMenuOption<T>[]
  onChange: (value: T) => void
  /** Shown on the trigger when no option matches the current value. */
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
}

/**
 * Single-select dropdown with the same look & behaviour as the vocabulary
 * filter "Sort" control: a pill trigger plus a floating menu (rendered through
 * a portal so it escapes any `overflow:hidden` ancestor) with a check on the
 * active option. Closes on outside-click and Escape.
 */
export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  ariaLabel = 'Select',
  disabled = false,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})

  const selected = options.find((o) => o.value === value)
  const triggerLabel = selected?.label ?? placeholder
  const hasValue = !!selected && selected.value !== ('' as T)

  // Position the portal menu under the trigger using fixed coordinates.
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left,
      minWidth: rect.width,
      zIndex: 200,
    })
  }, [open])

  // Close on outside pointer / Escape. The menu lives in document.body, so we
  // check both the trigger and the menu refs.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
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
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={[styles.trigger, hasValue ? styles.triggerActive : ''].join(' ').trim()}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {triggerLabel}
        <Icon icon={ChevronDown} size={13} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.menu}
            style={menuStyle}
            role="listbox"
            aria-label={ariaLabel}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={[styles.option, opt.value === value ? styles.optionActive : ''].join(' ').trim()}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
              >
                {opt.label}
                {opt.value === value && (
                  <Icon icon={Check} size={13} strokeWidth={2.5} style={{ marginLeft: 4 }} />
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
