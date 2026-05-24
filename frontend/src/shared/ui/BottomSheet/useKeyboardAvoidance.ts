import { useEffect } from 'react'

/**
 * Adjusts the bottom-sheet panel's bottom offset when the virtual keyboard
 * appears on mobile, preventing the keyboard from covering the sheet.
 *
 * Strategy:
 *   1. Prefer `window.visualViewport` (iOS 13+, Android Chrome 62+) — gives
 *      the exact visible height, so we can compute the keyboard intrusion.
 *   2. Fallback: listen for `window.resize` and compare `window.innerHeight`
 *      against the initial viewport height at mount time.
 *
 * The calculated offset is applied as `padding-bottom` on `containerRef` so
 * that content inside the sheet is scrollable above the keyboard.
 */

interface UseKeyboardAvoidanceOptions {
  /** Ref to the element whose `padding-bottom` will be adjusted */
  containerRef: React.RefObject<HTMLElement | null>
  /** Only apply adjustment when `enabled` is true (default: true) */
  enabled?: boolean
}

export function useKeyboardAvoidance({
  containerRef,
  enabled = true,
}: UseKeyboardAvoidanceOptions): void {
  useEffect(() => {
    if (!enabled) return

    const applyOffset = (offset: number) => {
      const el = containerRef.current
      if (!el) return
      el.style.paddingBottom = offset > 0 ? `${offset}px` : ''
    }

    // ── Path 1: visualViewport API ─────────────────────────────────────
    const vv = window.visualViewport
    if (vv) {
      const handleViewportResize = () => {
        // keyboard height = layout viewport height - visual viewport height
        const keyboardHeight = Math.max(
          0,
          window.innerHeight - vv.height - vv.offsetTop,
        )
        applyOffset(keyboardHeight)
      }

      vv.addEventListener('resize', handleViewportResize)
      vv.addEventListener('scroll', handleViewportResize)

      return () => {
        vv.removeEventListener('resize', handleViewportResize)
        vv.removeEventListener('scroll', handleViewportResize)
        applyOffset(0)
      }
    }

    // ── Path 2: window resize fallback ────────────────────────────────
    const initialHeight = window.innerHeight

    const handleWindowResize = () => {
      const keyboardHeight = Math.max(0, initialHeight - window.innerHeight)
      applyOffset(keyboardHeight)
    }

    window.addEventListener('resize', handleWindowResize)
    return () => {
      window.removeEventListener('resize', handleWindowResize)
      applyOffset(0)
    }
  }, [containerRef, enabled])
}
