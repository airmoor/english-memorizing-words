import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth } from '../../features/auth/ui/RequireAuth'
import { AuthPage } from '../../pages/auth/AuthPage'
import { ForgotPasswordPage } from '../../pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../../pages/auth/ResetPasswordPage'
import { HomePage } from '../../pages/home/HomePage'
import { SearchPage } from '../../pages/search/SearchPage'
import { ReviewPage } from '../../pages/review/ReviewPage'
import { VocabularyPage } from '../../pages/vocabulary/VocabularyPage'
import { ImportPage } from '../../pages/import/ImportPage'
import { SettingsPage } from '../../pages/settings/SettingsPage'

export function AppRouter() {
  return (
    <Routes>
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
      <Route
        path="/home"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/search"
        element={
          <RequireAuth>
            <SearchPage />
          </RequireAuth>
        }
      />
      <Route
        path="/vocabulary"
        element={
          <RequireAuth>
            <VocabularyPage />
          </RequireAuth>
        }
      />
      <Route
        path="/import"
        element={
          <RequireAuth>
            <ImportPage />
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
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
