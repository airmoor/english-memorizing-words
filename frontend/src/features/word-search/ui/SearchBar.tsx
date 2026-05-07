import type { KeyboardEvent } from 'react'
import { Input } from '../../../shared/ui/Input/Input'
import { Button } from '../../../shared/ui/Button/Button'
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
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search any English word…"
        fullWidth
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className={styles.input}
        aria-label="Word search input"
      />
      <Button
        onClick={onSearch}
        disabled={disabled || value.trim().length === 0}
        className={styles.btn}
      >
        Search
      </Button>
    </div>
  )
}
