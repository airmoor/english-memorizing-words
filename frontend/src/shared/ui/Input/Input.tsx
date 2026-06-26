import type { InputHTMLAttributes } from 'react'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean
  /** Marks the field invalid: danger border + danger focus ring + aria-invalid. */
  error?: boolean
}

export function Input({ fullWidth = false, error = false, className = '', ...props }: InputProps) {
  return (
    <input
      className={[styles.input, fullWidth ? styles.fullWidth : '', className].join(' ')}
      aria-invalid={error || undefined}
      {...props}
    />
  )
}
