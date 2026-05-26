import type { KeyboardEvent } from 'react'
import { Search } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import styles from './SearchBar.module.css'

interface Props {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  disabled?: boolean
}

export function SearchBar({ value, onChange, onSearch, disabled }: Props) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <div className={styles.bar}>
      <span className={styles.iconLeft} aria-hidden>
        <Icon icon={Search} size={18} />
      </span>
      <input
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
