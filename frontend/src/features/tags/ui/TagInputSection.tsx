import { useState, useRef, useId } from 'react'
import type { TagSummary } from '../../../entities/tag/model/types'
import { TagChip } from '../../../shared/ui/Chip/TagChip'
import { useTagsQuery } from '../model/useTagsQuery'
import { useAssignTagByName, useRemoveTagFromCard } from '../model/useCardTagMutation'
import styles from './TagInputSection.module.css'

interface TagInputSectionProps {
  cardId: string
  tags: TagSummary[]
}

/**
 * Inline tag input with autocomplete for the card detail view.
 *
 * - Displays existing tags as removable chips
 * - Typing in the input filters the user's tags as suggestions
 * - Enter or selecting a suggestion assigns the tag (find-or-create)
 * - Pressing × on a chip removes the tag from the card
 * - autocorrect/autocapitalize disabled to avoid mobile keyboard interference
 */
export function TagInputSection({ cardId, tags }: TagInputSectionProps) {
  const listboxId          = useId()
  const [inputVal, setInputVal] = useState('')
  const [focused,  setFocused]  = useState(false)
  const inputRef               = useRef<HTMLInputElement>(null)

  const { data: allTags = [] } = useTagsQuery()
  const assignMutation         = useAssignTagByName()
  const removeMutation         = useRemoveTagFromCard()

  const assignedIds = new Set(tags.map((t) => t.id))

  const suggestions = inputVal.trim().length > 0
    ? allTags
        .filter((t) =>
          !assignedIds.has(t.id) &&
          t.name.toLowerCase().includes(inputVal.toLowerCase()),
        )
        .slice(0, 8)
    : []

  const showDropdown = focused && suggestions.length > 0

  const commit = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    assignMutation.mutate({ cardId, name: trimmed })
    setInputVal('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(inputVal)
    }
    if (e.key === 'Escape') {
      setInputVal('')
      setFocused(false)
    }
  }

  const handleRemove = (tagId: string) => {
    removeMutation.mutate({ cardId, tagId })
  }

  return (
    <section className={styles.section} aria-label="Tags">
      <div className={styles.header}>
        <span className={styles.title}>Tags</span>
      </div>

      <div className={styles.chipRow}>
        {tags.map((tag) => (
          <TagChip
            key={tag.id}
            label={tag.name}
            onRemove={() => handleRemove(tag.id)}
          />
        ))}
      </div>

      <div className={styles.inputWrap}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="Add tag…"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Delay so clicks on suggestions register before blur clears them
            setTimeout(() => setFocused(false), 150)
          }}
          autoCorrect="off"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-controls={showDropdown ? listboxId : undefined}
          aria-label="Add tag"
        />

        {showDropdown && (
          <ul
            id={listboxId}
            className={styles.dropdown}
            role="listbox"
            aria-label="Tag suggestions"
          >
            {suggestions.map((tag) => (
              <li
                key={tag.id}
                role="option"
                aria-selected={false}
                className={styles.suggestion}
                onMouseDown={(e) => {
                  // Prevent input blur before onClick fires
                  e.preventDefault()
                  commit(tag.name)
                }}
              >
                {tag.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
