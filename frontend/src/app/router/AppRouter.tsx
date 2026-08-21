import { createBrowserRouter, createRoutesFromElements, Route, Navigate, RouterProvider } from 'react-router-dom'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { RequireAuth } from '../../features/auth/ui/RequireAuth'
import { RequireOnboarding } from '../../features/onboarding/ui/RequireOnboarding'
import { AuthPage } from '../../pages/auth/AuthPage'
import { ForgotPasswordPage } from '../../pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../../pages/auth/ResetPasswordPage'
import { HomePage } from '../../pages/home/HomePage'
import { SearchPage } from '../../pages/search/SearchPage'
import { ReviewPage } from '../../pages/review/ReviewPage'
import { VocabularyPage } from '../../pages/vocabulary/VocabularyPage'
import { ImportPage } from '../../pages/import/ImportPage'
import { SettingsPage } from '../../pages/settings/SettingsPage'
import { OnboardingPage } from '../../pages/onboarding/OnboardingPage'
import { SharedBoardPage } from '../../pages/shared-board/SharedBoardPage'
import { queryClient } from '../providers/AppProviders'
import { getNextCard } from '../../features/review/api/getNextCard'
import { getProgress } from '../../features/review/api/getProgress'
import { recordTabLocation } from '../../shared/lib/lastTabPath'

// Warms the `nextCard`/`progress` react-query cache before the `/review`
// navigation commits. Without this, the route mounts showing a Spinner and
// then swaps to the real Flashcard a beat later once those queries resolve —
// a second DOM mutation that lands *after* the `viewTransition` navigation's
// own commit. Chrome then aborts the in-flight view transition mid-crossfade
// (a benign InvalidStateError already silenced in main.tsx), which visually
// surfaces as the card flashing/dimming for a single frame right after the
// page loads. Prefetching here means the data is usually already cached by
// the time the transition commits, so there's no second mutation to race it.
// Swallow failures (e.g. logged-out 401s) — RequireAuth/RequireOnboarding in
// the element tree already handle redirecting; this loader only warms a
// cache, it must never block or fail the navigation itself.
async function reviewLoader({ request }: { request: Request }) {
  const boardId = new URL(request.url).searchParams.get('boardId') ?? undefined
  await Promise.allSettled([
    queryClient.ensureQueryData({
      queryKey: ['nextCard', { boardId }],
      queryFn: () => getNextCard(boardId),
    }),
    queryClient.ensureQueryData({
      queryKey: ['progress', { boardId }],
      queryFn: () => getProgress(boardId),
    }),
  ])
  return null
}

// A data router (rather than plain <BrowserRouter>) is required for the
// `viewTransition` navigation option used throughout the app — see
// shared/lib/navigation.tsx — which is what gives route changes their
// native cross-fade instead of a hard cut.
const router = createBrowserRouter(
  createRoutesFromElements(
    // Pathless wrapper route: no path/element of its own (renders an <Outlet/>
    // by default), exists purely so its errorElement catches a render-time
    // throw from ANY page below instead of React Router's raw crash screen.
    <Route errorElement={<RouteErrorBoundary />}>
      {/* Root: authenticated → /home, unauthenticated → /login (handled by RequireAuth) */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Navigate to="/home" replace />
          </RequireAuth>
        }
      />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {/* Public — no RequireAuth. Read-only preview of an unlisted board;
          signed-in visitors get an "Add to my vocabulary" action. */}
      <Route path="/board/:slug" element={<SharedBoardPage />} />
      {/* No RequireOnboarding here — this is the redirect target itself. */}
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        }
      />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <RequireOnboarding>
              <HomePage />
            </RequireOnboarding>
          </RequireAuth>
        }
      />
      <Route
        path="/search"
        element={
          <RequireAuth>
            <RequireOnboarding>
              <SearchPage />
            </RequireOnboarding>
          </RequireAuth>
        }
      />
      <Route
        path="/vocabulary"
        element={
          <RequireAuth>
            <RequireOnboarding>
              <VocabularyPage />
            </RequireOnboarding>
          </RequireAuth>
        }
      />
      <Route
        path="/import"
        element={
          <RequireAuth>
            <RequireOnboarding>
              <ImportPage />
            </RequireOnboarding>
          </RequireAuth>
        }
      />
      <Route
        path="/review"
        loader={reviewLoader}
        element={
          <RequireAuth>
            <RequireOnboarding>
              <ReviewPage />
            </RequireOnboarding>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <RequireOnboarding>
              <SettingsPage />
            </RequireOnboarding>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Route>
  )
)

// Tracks the last visited path (with query string) per bottom-nav tab, outside
// React's lifecycle, so MobileBottomNav can restore search/filter state on tab
// switch instead of always landing on the tab's bare root. See lastTabPath.ts.
// Seed from the initial URL too — subscribe only fires on subsequent transitions.
recordTabLocation(router.state.location.pathname, router.state.location.search)
router.subscribe((state) => {
  recordTabLocation(state.location.pathname, state.location.search)
})

export function AppRouter() {
  return <RouterProvider router={router} />
}
