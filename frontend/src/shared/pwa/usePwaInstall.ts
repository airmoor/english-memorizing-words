import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Returns install prompt state + trigger.
 *
 * `canInstall` → true when the browser has queued a beforeinstallprompt event
 *               and the user has not yet been prompted this session.
 * `install()`  → shows the native install dialog.
 * `dismiss()`  → hides the in-app CTA for this session without prompting.
 * `isStandalone` → true when running as an installed PWA (standalone mode).
 */
export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!promptEvent) return
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      setPromptEvent(null)
    }
  }

  function dismiss() {
    setDismissed(true)
  }

  return {
    canInstall: !!promptEvent && !dismissed && !isStandalone,
    isStandalone,
    install,
    dismiss,
  }
}
