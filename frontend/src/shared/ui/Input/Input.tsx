import type { InputHTMLAttributes } from 'react'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean
}

export function Input({ fullWidth = false, className = '', ...props }: InputProps) {
  return (
    <input
      className={[styles.input, fullWidth ? styles.fullWidth : '', className].join(' ')}
      {...props}
    />
  )
}
