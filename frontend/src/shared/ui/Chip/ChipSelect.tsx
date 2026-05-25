import { useRef } from 'react'
import styles from './ChipSelect.module.css'

export interface ChipOption<T extends string = string> {
  value: T
  label: string
  disabled?: boolean
}

interface ChipSelectProps<T extends string = string> {
  options: ChipOption<T>[]
  value: T[]
  onChange: (next: T[]) => void
  /** Allow at most one selection at a time (radio behaviour). Default: false */
  single?: boolean
  className?: string
  /** Accessible label for the chip group */
  ariaLabel?: string
}

/**
 * Horizontal scrollable chip row for multi-select (or single-select) filtering.
 *
 * Controlled component — value is an array of selected option values.
 * Keyboard accessible:
 *   - Enter/Space toggles the focused chip
 *   - ArrowLeft/ArrowRight moves focus between chips
 *   - Home/End jumps to first/last chip
 */
export function ChipSelect<T extends string = string>({
  options,
  value,
  onChange,
  single = false,
  className,
  ariaLabel,
}: ChipSelectProps<T>) {
  const rowRef = useRef<HTMLDivElement>(null)

  function toggle(v: T) {
    if (single) {
      onChange(value.includes(v) ? [] : [v])
      return
    }
    onChange(
      value.includes(v) ? value.filter((x) => x !== v) : [...value, v],
    )
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!rowRef.current) return
    const chips = Array.from(
      rowRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'),
    )
    if (chips.length === 0) return
    const current = document.activeElement as HTMLButtonElement
    const idx = chips.indexOf(current)

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      chips[(idx + 1) % chips.length].focus()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      chips[(idx - 1 + chips.length) % chips.length].focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      chips[0].focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      chips[chips.length - 1].focus()
    }
  }

  // For single-select, use radiogroup/radio roles; for multi-select, group/checkbox.
  const groupRole  = single ? 'radiogroup' : 'group'
  const chipRole   = single ? 'radio'       : 'checkbox'

  return (
    <div
      ref={rowRef}
      className={[styles.row, className ?? ''].join(' ')}
      role={groupRole}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {options.map((opt) => {
        const selected = value.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            role={chipRole}
            aria-checked={selected}
            disabled={opt.disabled}
            onClick={() => toggle(opt.value)}
            className={[styles.chip, selected ? styles.selected : ''].join(' ')}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
