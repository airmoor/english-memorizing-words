import { Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth } from '../../features/auth/ui/RequireAuth'
import { AuthPage } from '../../pages/auth/AuthPage'
import { SearchPage } from '../../pages/search/SearchPage'
import { ReviewPage } from '../../pages/review/ReviewPage'
import { VocabularyPage } from '../../pages/vocabulary/VocabularyPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
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
        path="/review"
        element={
          <RequireAuth>
            <ReviewPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
