import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useEffect, useReducer } from 'react'
import { createPortal } from 'react-dom'
import { subscribeToToasts } from './toastBus'
import type { ToastMessage } from './toastBus'
import { Icon } from '../Icon/Icon'
import styles from './Toaster.module.css'

const TOAST_DURATION = 4000 // ms before auto-dismiss

type Action =
  | { type: 'add'; msg: ToastMessage }
  | { type: 'remove'; id: string }

function reducer(state: ToastMessage[], action: Action): ToastMessage[] {
  switch (action.type) {
    case 'add':
      // Cap at 4 toasts to avoid stacking too many on screen at once
      return [...state.slice(-3), action.msg]
    case 'remove':
      return state.filter((t) => t.id !== action.id)
  }
}

const LEVEL_ICON = {
  success: CheckCircle,
  error:   AlertTriangle,
  info:    Info,
} as const

/**
 * Mounts at the app root. Listens to the toast bus and renders notifications
 * in a fixed portal above all content.
 *
 * Usage from anywhere (no context required):
 *   import { toast } from 'shared/ui/Toast'
 *   toast.error('Couldn't save.')
 */
export function Toaster() {
  const [toasts, dispatch] = useReducer(reducer, [])

  useEffect(() => {
    return subscribeToToasts((msg) => {
      dispatch({ type: 'add', msg })
      setTimeout(() => dispatch({ type: 'remove', id: msg.id }), TOAST_DURATION)
    })
  }, [])

  if (toasts.length === 0) return null

  return createPortal(
    <div className={styles.stack} role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={[styles.toast, styles[t.level]].join(' ')}>
          <span className={styles.icon}>
            <Icon icon={LEVEL_ICON[t.level]} size={16} />
          </span>
          <span className={styles.text}>{t.text}</span>
          <button
            type="button"
            className={[styles.dismiss, 'icon-action'].join(' ')}
            aria-label="Dismiss notification"
            onClick={() => dispatch({ type: 'remove', id: t.id })}
          >
            <Icon icon={X} size={14} muted />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
