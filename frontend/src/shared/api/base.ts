import { tokenStore } from '../lib/tokenStore'

const BASE = '/api'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return false
    const body = await res.json().catch(() => null)
    if (!body?.accessToken) return false
    tokenStore.set(body.accessToken)
    return true
  } catch {
    return false
  }
}

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
    tokenStore.clear()
    window.location.href = '/'
    throw new ApiError(401, 'Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.message ?? res.statusText)
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
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}
