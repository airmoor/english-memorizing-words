import { useEffect, useState, type ReactNode } from 'react'
import styles from './Crossfade.module.css'

/** Keep in sync with `--crossfade-duration` in Crossfade.module.css. */
const DURATION_MS = 200

interface Props {
  /** When true, `children` is shown; when false, `fallback` is shown. */
  ready: boolean
  fallback: ReactNode
  children: ReactNode
}

/**
 * Crossfades `fallback` → `children` in the same layout slot so the outgoing
 * layer stays visible while the incoming one eases in. A ternary that unmounts
 * the old tree and fades the new one from opacity 0 leaves a blank frame;
 * this keeps both stacked until the fade finishes.
 *
 * If `ready` is already true on mount (cached data), children render immediately
 * with no animation.
 */
export function Crossfade({ ready, fallback, children }: Props) {
  const [keepFallback, setKeepFallback] = useState(!ready)

  useEffect(() => {
    if (!ready) {
      setKeepFallback(true)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setKeepFallback(false)
      return
    }
    const id = window.setTimeout(() => setKeepFallback(false), DURATION_MS)
    return () => window.clearTimeout(id)
  }, [ready])

  return (
    <div className={styles.root}>
      {keepFallback && (
        <div
          className={ready ? styles.exit : undefined}
          aria-hidden={ready || undefined}
        >
          {fallback}
        </div>
      )}
      {ready && (
        <div className={keepFallback ? styles.enter : undefined}>
          {children}
        </div>
      )}
    </div>
  )
}
