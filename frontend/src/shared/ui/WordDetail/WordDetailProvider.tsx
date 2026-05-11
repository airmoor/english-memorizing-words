import type { ReactNode } from 'react'
import { WordDetailContainer } from './WordDetailContainer'

interface Props {
  children: ReactNode
  /** Called when the user saves the current word. */
  onSave?: (wordId: string) => void
  /** Called when the user removes the current word. Closes the panel automatically. */
  onRemove?: (wordId: string) => void
}

/**
 * Wraps a page with the word detail system.
 *
 * Mounts WordDetailContainer once — not per row. One BottomSheet or SidePanel
 * exists in the DOM at any time regardless of how many words are on screen.
 *
 * Usage (vocabulary page):
 * ```tsx
 * <WordDetailProvider onRemove={remove}>
 *   <VocabularyList items={items} />
 * </WordDetailProvider>
 * ```
 *
 * Usage (search page — Phase 5):
 * ```tsx
 * <WordDetailProvider onSave={save} onRemove={remove}>
 *   <WordEntry ... />
 * </WordDetailProvider>
 * ```
 */
export function WordDetailProvider({ children, onSave, onRemove }: Props) {
  return (
    <WordDetailContainer onSave={onSave} onRemove={onRemove}>
      {children}
    </WordDetailContainer>
  )
}
