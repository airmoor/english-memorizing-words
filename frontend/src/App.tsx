import { AppProviders } from './app/providers/AppProviders'
import { AppRouter } from './app/router/AppRouter'
import styles from './App.module.css'

export default function App() {
  return (
    <>
      {/* Fixed background layer — sits behind all content, anchored to the
          viewport by position:fixed. Gradient positions are always relative
          to the viewport, never to document height. */}
      <div className={styles.background} aria-hidden="true" />
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </>
  )
}
