import { useState } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { Icon } from '../../../shared/ui/Icon/Icon'
import { AdaptiveSheet } from '../../../shared/ui/AdaptiveSheet/AdaptiveSheet'
import { BottomSheetContent } from '../../../shared/ui/BottomSheet/BottomSheetContent'
import { useSetBoardVisibilityMutation } from '../model/useSetBoardVisibilityMutation'
import type { Board } from '../../../entities/board/model/types'
import styles from './ShareBoardSheet.module.css'

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

interface ShareBoardSheetProps {
  open: boolean
  onClose: () => void
  board: Board | undefined
}

/**
 * Toggle a board between private and unlisted, and copy its share link.
 * The link is only shown while the board is unlisted — turning it back to
 * private clears the slug server-side, so the previous link stops working.
 */
export function ShareBoardSheet({ open, onClose, board }: ShareBoardSheetProps) {
  const mutation = useSetBoardVisibilityMutation()
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  // Reset the "Copied" label whenever the sheet re-opens — "setState during
  // render" sync (matches the pattern in VocabularyPage.tsx) instead of an
  // effect, since resetting on every reopen is derivable from props alone.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setCopyState('idle')
  }

  if (!board) return null

  const isUnlisted = board.visibility === 'unlisted'
  const shareUrl = board.shareSlug ? `${window.location.origin}/board/${board.shareSlug}` : null

  const handleToggle = () => {
    mutation.mutate({ id: board.id, visibility: isUnlisted ? 'private' : 'unlisted' })
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    const ok = await copyToClipboard(shareUrl)
    if (ok) {
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  return (
    <AdaptiveSheet open={open} onClose={onClose} label="Share board">
      <BottomSheetContent>
        <div className={styles.wrap}>
          <div className={styles.header}>
            <h2 className={styles.title}>Share &ldquo;{board.name}&rdquo;</h2>
            <button
              type="button"
              className={[styles.closeBtn, 'icon-action'].join(' ')}
              onClick={onClose}
              aria-label="Close"
            >
              <Icon icon={X} size={18} />
            </button>
          </div>

          <div className={styles.body}>
            <label className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <span className={styles.toggleLabel}>Anyone with the link can view</span>
                <span className={styles.toggleHint}>
                  {isUnlisted
                    ? 'This board is shared. People with the link see a read-only copy of its words.'
                    : 'Turn this on to get a link you can send to anyone.'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isUnlisted}
                className={[styles.switch, isUnlisted ? styles.switchOn : ''].join(' ')}
                onClick={handleToggle}
                disabled={mutation.isPending}
              >
                <span className={styles.switchThumb} />
              </button>
            </label>

            {isUnlisted && shareUrl && (
              <div className={styles.linkRow}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className={styles.linkInput}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Share link"
                />
                <button
                  type="button"
                  className={styles.copyBtn}
                  onClick={handleCopy}
                >
                  <Icon icon={copyState === 'copied' ? Check : Copy} size={14} />
                  {copyState === 'copied' ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}

            {isUnlisted && (
              <p className={styles.note}>
                Turning sharing off breaks this link — sharing again later creates a new one.
              </p>
            )}
          </div>
        </div>
      </BottomSheetContent>
    </AdaptiveSheet>
  )
}
