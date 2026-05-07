import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProviders } from './app/providers/AppProviders'
import { RequireAuth } from './features/auth/ui/RequireAuth'
import { AuthPage } from './pages/auth/AuthPage'
import { SearchPage } from './pages/search/SearchPage'
import { ReviewPage } from './pages/review/ReviewPage'

export default function App() {
  return (
    <AppProviders>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route
          path="/search"
          element={
            <RequireAuth>
              <SearchPage />
            </RequireAuth>
          }
        />
        <Route
          path="/review"
          element={
            <RequireAuth>
              <ReviewPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProviders>
  )
}
