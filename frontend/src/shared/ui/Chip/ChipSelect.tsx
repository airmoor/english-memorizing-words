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
}

/**
 * Horizontal scrollable chip row for multi-select (or single-select) filtering.
 *
 * Controlled component — value is an array of selected option values.
 * Keyboard accessible: Enter/Space toggles, arrow keys move focus.
 */
export function ChipSelect<T extends string = string>({
  options,
  value,
  onChange,
  single = false,
  className,
}: ChipSelectProps<T>) {
  function toggle(v: T) {
    if (single) {
      onChange(value.includes(v) ? [] : [v])
      return
    }
    onChange(
      value.includes(v) ? value.filter((x) => x !== v) : [...value, v],
    )
  }

  return (
    <div
      className={[styles.row, className ?? ''].join(' ')}
      role="group"
    >
      {options.map((opt) => {
        const selected = value.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            role="checkbox"
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
