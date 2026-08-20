import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Route changes animate via the native View Transitions API (see
// shared/lib/navigation.tsx). Browsers without it fall back to the plain CSS
// enter animation on PageLayout's content wrapper — flagged here, before the
// first paint, so the two mechanisms never both fire on the same navigation.
if (typeof (document as { startViewTransition?: unknown }).startViewTransition !== 'function') {
  document.documentElement.classList.add('no-view-transitions')
}

// React Router's `viewTransition` navigation option calls
// document.startViewTransition() without attaching a rejection handler to its
// `ready`/`finished` promises. When the transition can't fully settle inside
// one synchronous update (a known upstream gap in how it interacts with
// React's rendering) the browser aborts it with a benign InvalidStateError
// that surfaces here as an unhandled rejection — the navigation itself still
// completes correctly. Silence just that one known-benign class so it
// doesn't drown out real errors in the console.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as unknown
  if (
    reason instanceof DOMException &&
    reason.name === 'InvalidStateError' &&
    /transition/i.test(reason.message)
  ) {
    event.preventDefault()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
