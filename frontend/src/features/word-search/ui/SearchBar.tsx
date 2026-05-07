import type { KeyboardEvent } from 'react'
import styles from './SearchBar.module.css'

interface Props {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  disabled?: boolean
}

/** Search-icon SVG, currentColor. */
function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function SearchBar({ value, onChange, onSearch, disabled }: Props) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <div className={styles.bar}>
      <span className={styles.iconLeft} aria-hidden>
        <SearchIcon />
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
