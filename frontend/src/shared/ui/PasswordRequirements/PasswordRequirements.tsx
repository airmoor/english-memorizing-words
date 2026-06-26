import { Check } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import styles from './PasswordRequirements.module.css'

/**
 * Password rules — kept in lock-step with the backend AuthCredentialsDto
 * (`@MinLength(8)` + `@IsStrongPassword({ minLowercase, minUppercase,
 * minNumbers, minSymbols })`). The "special character" test mirrors
 * validator.js isStrongPassword, which counts any non-alphanumeric character.
 */
export interface PasswordRule {
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One lowercase letter (a–z)', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One uppercase letter (A–Z)', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One number (0–9)', test: (pw) => /[0-9]/.test(pw) },
  { label: 'One special character (!@#$…)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

/** True only when every rule passes — use to gate registration submit. */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password))
}

interface Props {
  password: string
}

export function PasswordRequirements({ password }: Props) {
  return (
    <ul className={styles.list} aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li
            key={rule.label}
            className={[styles.item, met ? styles.met : ''].join(' ')}
          >
            <Icon icon={Check} size={14} className={styles.icon} />
            <span>{rule.label}</span>
          </li>
        )
      })}
    </ul>
  )
}
