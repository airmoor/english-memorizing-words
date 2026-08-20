import { useEffect, useState } from 'react'

const QUERY = '(min-width: 1024px) and (pointer: fine)'

/**
 * True when the viewport is desktop-width AND the primary input is a mouse
 * (not touch) — gates pointer-only interactions like drag-and-drop that have
 * no equivalent affordance on touch/mobile layouts.
 */
export function useIsPointerDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const update = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isDesktop
}
