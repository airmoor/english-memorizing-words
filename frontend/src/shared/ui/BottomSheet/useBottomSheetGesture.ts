import { useCallback, useRef } from 'react'

/**
 * Attach pointer-event drag gesture to a bottom sheet panel element.
 *
 * The hook returns `bindDrag` — spread its result onto the element that
 * should respond to drag (typically the panel root or the drag handle).
 *
 * Dismissal fires when:
 *   - The user drags down past `threshold` pixels (default 80px), OR
 *   - The release velocity exceeds `velocityThreshold` px/ms (default 0.4)
 *
 * While dragging, the panel is translated downward without a transition so
 * the movement is instant. On release the CSS transition takes over.
 */

interface UseBottomSheetGestureOptions {
  /** Ref to the panel element that will be translated during drag */
  panelRef: React.RefObject<HTMLElement | null>
  /** Called when the dismiss threshold or velocity is exceeded */
  onDismiss: () => void
  /** Drag-down distance (px) that triggers dismiss (default 80) */
  threshold?: number
  /** Release velocity (px/ms) that triggers dismiss (default 0.4) */
  velocityThreshold?: number
}

interface DragBindings {
  onPointerDown: (e: React.PointerEvent) => void
}

export function useBottomSheetGesture({
  panelRef,
  onDismiss,
  threshold = 80,
  velocityThreshold = 0.4,
}: UseBottomSheetGestureOptions): DragBindings {
  const startY      = useRef(0)
  const startTime   = useRef(0)
  const currentDy   = useRef(0)
  const isDragging  = useRef(false)

  const applyTranslate = useCallback((dy: number) => {
    const el = panelRef.current
    if (!el) return
    const clamped = Math.max(0, dy)
    el.style.transition = 'none'
    el.style.transform  = `translateY(${clamped}px)`
  }, [panelRef])

  const resetTranslate = useCallback(() => {
    const el = panelRef.current
    if (!el) return
    // Re-enable transition so the snap-back animates
    el.style.transition = ''
    el.style.transform  = ''
  }, [panelRef])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only respond to primary pointer (left button / touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return

    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    isDragging.current = true
    startY.current     = e.clientY
    startTime.current  = e.timeStamp
    currentDy.current  = 0

    const handleMove = (moveEvt: PointerEvent) => {
      if (!isDragging.current) return
      const dy = moveEvt.clientY - startY.current
      currentDy.current = dy
      applyTranslate(dy)
    }

    const handleUp = (upEvt: PointerEvent) => {
      if (!isDragging.current) return
      isDragging.current = false

      el.removeEventListener('pointermove', handleMove)
      el.removeEventListener('pointerup',   handleUp)
      el.removeEventListener('pointercancel', handleUp)

      const dy       = currentDy.current
      const elapsed  = upEvt.timeStamp - startTime.current
      const velocity = elapsed > 0 ? dy / elapsed : 0

      if (dy >= threshold || velocity >= velocityThreshold) {
        onDismiss()
      } else {
        resetTranslate()
      }
    }

    el.addEventListener('pointermove',   handleMove)
    el.addEventListener('pointerup',     handleUp)
    el.addEventListener('pointercancel', handleUp)
  }, [applyTranslate, onDismiss, resetTranslate, threshold, velocityThreshold])

  return { onPointerDown }
}
