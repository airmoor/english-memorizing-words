import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import styles from './PasswordInput.module.css'

/**
 * PasswordInput — a password field with a show/hide toggle.
 *
 * Drop-in replacement for `<input type="password" />`. Forwards every native
 * input prop and the caller's `className`, so each form keeps its own input
 * styling; this component only layers on the toggle button and the right
 * padding needed to keep the text clear of it.
 */
type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false)

    return (
      <span className={styles.wrapper}>
        <input
          {...props}
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={className}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          <Icon icon={visible ? EyeOff : Eye} size={18} muted />
        </button>
      </span>
    )
  },
)
