import { tokenStore } from '../lib/tokenStore'

// In development VITE_API_URL is unset — Vite's dev server proxies /api to the backend.
// In production it must be the backend root URL (no trailing slash), e.g. https://api.example.com
const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`

/**
 * A single flattened validation error from the backend.
 * Mirrors `FlatValidationError` in `validation-exception.factory.ts`.
 */
export interface ValidationErrorDetail {
  /** Dot/bracket path from the request root. Example: "words[3].word" */
  path: string
  /** class-validator constraint name. Example: "maxLength", "isUUID" */
  constraint: string
  /** Raw validator message — for logging/debugging, never shown directly in UI. */
  message: string
}

export class ApiError extends Error {
  status: number
  /**
   * Structured validation details present on HTTP 400 responses from
   * endpoints that use the custom `validationExceptionFactory`.
   * Undefined for all other error types.
   */
  validationErrors?: ValidationErrorDetail[]

  constructor(status: number, message: string, validationErrors?: ValidationErrorDetail[]) {
    super(message)
    this.status = status
    this.validationErrors = validationErrors
  }
}

// ── Proactive token refresh ──────────────────────────────────────────────────
//
// After a successful refresh we schedule a silent re-refresh ~1 minute before
// the access token expires. This prevents the "all queries 401 simultaneously"
// race condition that would otherwise fire every 15 minutes (the access TTL).

let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null

/** Parse the `exp` claim from a JWT without verifying the signature. */
function decodeExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

/**
 * Schedule a silent token refresh ~1 minute before the access token expires.
 * Calling this again cancels any previously scheduled refresh first.
 * Safe to call on logout because if the cookie is gone the refresh will fail
 * silently and the timer self-clears.
 */
export function scheduleProactiveRefresh(accessToken: string): void {
  if (proactiveRefreshTimer !== null) {
    clearTimeout(proactiveRefreshTimer)
    proactiveRefreshTimer = null
  }

  const exp = decodeExp(accessToken)
  if (exp === null) return

  const refreshAtMs = exp * 1000 - 60_000 // 1 minute before expiry
  const delay = refreshAtMs - Date.now()
  if (delay <= 0) {
    // Token already close to or past expiry — refresh immediately
    void refreshToken()
    return
  }

  proactiveRefreshTimer = setTimeout(() => {
    proactiveRefreshTimer = null
    void refreshToken()
  }, delay)
}

// ── Refresh singleton ────────────────────────────────────────────────────────
//
// Root cause of "unexpected logout" bug:
//   When the access token expires, every concurrent TanStack Query that gets
//   a 401 independently calls refreshToken(). The backend uses an atomic
//   single-use session (DELETE with `affected` check), so only one concurrent
//   refresh request wins — the rest get 401. Each losing caller was then
//   calling tokenStore.clear() + window.location.href = '/' → logout.
//
// Fix: share a single in-flight Promise. All concurrent callers that need a
//   refresh await the same request. The server sees exactly one refresh
//   request. All callers get the same success/failure result.

let inflightRefresh: Promise<boolean> | null = null

export async function refreshToken(): Promise<boolean> {
  if (inflightRefresh) return inflightRefresh

  inflightRefresh = _performRefresh().finally(() => {
    inflightRefresh = null
  })
  return inflightRefresh
}

async function _performRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false

    const body = await res.json().catch(() => null)
    if (!body?.accessToken) return false

    tokenStore.set(body.accessToken)
    // Schedule the next proactive refresh based on the new token's exp
    scheduleProactiveRefresh(body.accessToken)
    return true
  } catch {
    return false
  }
}

// ── Core request function ────────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit = {}, isRetry = false): Promise<T> {
  const token = tokenStore.get()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' })

  if (res.status === 401 && !isRetry) {
    const refreshed = await refreshToken()
    if (refreshed) {
      return request<T>(path, init, true)
    }
    // Genuine session expiry — clear in-memory token and redirect.
    // Uses location replace (full reload) so all in-memory state is wiped cleanly.
    tokenStore.clear()
    window.location.replace('/')
    throw new ApiError(401, 'Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // Extract structured validation details when present (HTTP 400 from
    // validationExceptionFactory). Falls back to generic message for all other errors.
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : (body.message ?? res.statusText)
    throw new ApiError(res.status, message, body.validationErrors)
  }

  if (res.status === 204) return undefined as T

  // NestJS serialises a `null` controller return value as HTTP 200 with an empty
  // body (Content-Length: 0). Calling .json() on that throws "Unexpected end of
  // JSON input". Treat empty 2xx bodies as null — callers must type T as e.g.
  // `Foo | null` to model an absent resource.
  const contentLength = res.headers.get('content-length')
  if (contentLength === '0') return null as T

  const text = await res.text()
  if (text.length === 0) return null as T
  return JSON.parse(text) as T
}

export const apiClient = {
  get:    <T>(path: string)                                           => request<T>(path),
  post:   <T>(path: string, body?: unknown, signal?: AbortSignal)    => request<T>(path, { method: 'POST',  body: JSON.stringify(body), signal }),
  put:    <T>(path: string, body?: unknown)                          => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown)                          => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string)                                          => request<T>(path, { method: 'DELETE' }),
}
