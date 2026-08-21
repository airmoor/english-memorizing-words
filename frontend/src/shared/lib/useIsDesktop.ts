import { useEffect, useState } from 'react'

const DESKTOP_MQ = '(min-width: 1024px)'

/**
 * True when the viewport is desktop-width, regardless of pointer type.
 * For pointer-only gating (e.g. drag-and-drop) use useIsPointerDesktop instead.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}
