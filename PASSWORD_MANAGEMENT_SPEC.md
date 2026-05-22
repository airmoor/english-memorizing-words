# Password Management — Implementation Spec

## Status

### Backend

| Task | Status |
|------|--------|
| `POST /auth/request-password-reset` endpoint | ✅ Done (pre-existing) |
| `POST /auth/reset-password` endpoint | ✅ Done (pre-existing) |
| `POST /auth/update-password` (change password, authenticated) | ✅ Done (pre-existing) |
| Rate limiting on all three endpoints | ✅ Done (pre-existing) |
| No user enumeration on forgot-password | ✅ Done (silent return for unknown email) |
| SHA-256 token hashing (never store raw token) | ✅ Done (pre-existing) |
| bcrypt password hashing (cost 12) | ✅ Done (pre-existing) |
| Token expiry (30 min) | ✅ Done (pre-existing) |
| Single-use tokens (affected-count gate in transaction) | ✅ Done (race-condition guard) |
| Session invalidation after password reset | ✅ Done (deletes all refresh sessions) |
| Strong password validation (`@IsStrongPassword`) | ✅ Done (pre-existing) |
| DB migration: `password_reset_tokens` table | ✅ Done (pre-existing) |
| `EmailService` — dev console fallback | ✅ Done (pre-existing) |
| `EmailService` — Resend SDK integration | ✅ Done (this session) |
| HTML email template | ✅ Done (this session) |
| `resend` npm package installed | ✅ Done (this session) |

### Frontend

| Task | Status |
|------|--------|
| `/forgot-password` page | ✅ Done (this session) |
| `/reset-password` page with `?token=` query param | ✅ Done (this session) |
| Success state on forgot-password (no enumeration) | ✅ Done |
| Error handling on reset-password (expired/invalid token) | ✅ Done |
| Redirect to `/login` after successful reset | ✅ Done (2s delay) |
| "Forgot password?" link on login form | ✅ Done (this session) |
| Change password form in Settings page | ✅ Done (this session) |
| API: `forgotPasswordApi` | ✅ Done (this session) |
| API: `resetPasswordApi` | ✅ Done (this session) |
| API: `changePasswordApi` | ✅ Done (this session) |
| Routes registered in AppRouter | ✅ Done (this session) |

## Environment Variables Required

```env
# Backend
RESEND_API_KEY=re_...          # Resend API key (https://resend.com/api-keys)
EMAIL_FROM=Lexis <noreply@yourdomain.com>  # Must be a verified Resend sender
FRONTEND_URL=https://yourdomain.com        # Used to build reset link URL

# Frontend (Vite)
VITE_API_URL=https://api.yourdomain.com   # Omit in dev (Vite proxy handles /api)
```

## Architecture Notes

- The backend endpoint is `POST /auth/request-password-reset` (not `/forgot-password` as in
  the spec — kept as-is to avoid breaking existing tests and API shape).
- `EmailService` auto-detects env: if `RESEND_API_KEY` is missing it logs the reset URL to
  console (safe dev mode). No code changes needed when moving to production.
- Resend errors are **not** caught inside `requestPasswordReset` — they propagate as 500.
  This is intentional: a failed email send should be visible as an error rather than silently
  swallowing a delivery failure.
- The change-password form in Settings calls `POST /auth/update-password`. On success the
  backend invalidates all other refresh sessions automatically.
