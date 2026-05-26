import { useRef, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import styles from './SearchBar.module.css'

interface Props {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  disabled?: boolean
}

export function SearchBar({ value, onChange, onSearch, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onSearch()
  }

  function handleClear() {
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div className={styles.bar}>
      <span className={styles.iconLeft} aria-hidden>
        <Icon icon={Search} size={18} />
      </span>

      {/* Input wrapper — hosts the text field + absolute-positioned × button */}
      <div className={styles.inputWrap}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search any English word…"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={styles.input}
          aria-label="Word search input"
        />
        {value && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={handleClear}
            aria-label="Clear search"
            tabIndex={-1}
          >
            <Icon icon={X} size={12} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onSearch}
        disabled={disabled || value.trim().length === 0}
        className={styles.btn}
      >
        Search
      </button>
    </div>
  )
}
