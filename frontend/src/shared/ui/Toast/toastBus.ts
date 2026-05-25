/**
 * Minimal publish/subscribe bus for toast notifications.
 *
 * Decouples mutations (which have no React context) from the Toaster
 * component. Mutations call `toast.error("message")` directly; the
 * Toaster subscribes on mount.
 */

export type ToastLevel = 'error' | 'success' | 'info'

export interface ToastMessage {
  id: string
  level: ToastLevel
  text: string
}

type Listener = (msg: ToastMessage) => void

let _id = 0
const listeners = new Set<Listener>()

function publish(level: ToastLevel, text: string) {
  const msg: ToastMessage = { id: String(++_id), level, text }
  listeners.forEach((fn) => fn(msg))
}

export const toast = {
  error:   (text: string) => publish('error', text),
  success: (text: string) => publish('success', text),
  info:    (text: string) => publish('info', text),
}

export function subscribeToToasts(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
