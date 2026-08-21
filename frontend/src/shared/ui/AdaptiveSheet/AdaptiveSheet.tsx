import type { ReactNode } from 'react'
import { BottomSheet } from '../BottomSheet/BottomSheet'
import { Modal } from './Modal'
import { useIsDesktop } from '../../lib/useIsDesktop'

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
