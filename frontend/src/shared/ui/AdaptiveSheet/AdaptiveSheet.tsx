import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BottomSheet } from '../BottomSheet/BottomSheet'
import { Modal } from './Modal'

const DESKTOP_MQ = '(min-width: 1024px)'

function useIsDesktop(): boolean {
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

interface AdaptiveSheetProps {
  open: boolean
  onClose: () => void
  /** Accessible label for the dialog */
  label: string
  labelId?: string
  children: ReactNode
}

/**
 * Renders a centered `Modal` on desktop (≥1024px) and a `BottomSheet` on mobile.
 *
 * Drop-in replacement for BottomSheet wherever desktop modal behaviour is desired.
 * Both renderers accept the same props — switching is seamless on resize.
 */
export function AdaptiveSheet({ open, onClose, label, labelId, children }: AdaptiveSheetProps) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <Modal open={open} onClose={onClose} label={label} labelId={labelId}>
        {children}
      </Modal>
    )
  }

  return (
    <BottomSheet open={open} onClose={onClose} label={label} labelId={labelId}>
      {children}
    </BottomSheet>
  )
}
