import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * SheetContext tracks the stack of open bottom sheets so that:
 *   - The most-recently opened sheet is the "active" (top) one
 *   - Backdrop click / Escape only closes the topmost sheet
 *   - Nested sheets don't close their parent
 */

interface SheetContextValue {
  /** Register a new sheet and return its unique ID */
  pushSheet: (id: string) => void
  /** Remove a sheet from the stack */
  popSheet:  (id: string) => void
  /** Returns true if this sheet is the topmost open one */
  isTopSheet: (id: string) => boolean
}

const SheetContext = createContext<SheetContextValue | null>(null)

let _idCounter = 0
/** Generate a stable unique ID for a sheet instance */
export function nextSheetId(): string {
  return `sheet-${++_idCounter}`
}

export function SheetProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<string[]>([])

  const pushSheet = useCallback((id: string) => {
    setStack(prev => [...prev.filter(s => s !== id), id])
  }, [])

  const popSheet = useCallback((id: string) => {
    setStack(prev => prev.filter(s => s !== id))
  }, [])

  const isTopSheet = useCallback(
    (id: string) => stack[stack.length - 1] === id,
    [stack],
  )

  return (
    <SheetContext.Provider value={{ pushSheet, popSheet, isTopSheet }}>
      {children}
    </SheetContext.Provider>
  )
}

/** Used internally by BottomSheet to register/deregister with the stack */
export function useSheetContext() {
  const ctx = useContext(SheetContext)
  if (!ctx) {
    // Graceful fallback: if no SheetProvider, every sheet behaves as top
    return {
      pushSheet:  (_id: string) => {},
      popSheet:   (_id: string) => {},
      isTopSheet: (_id: string) => true,
    }
  }
  return ctx
}
