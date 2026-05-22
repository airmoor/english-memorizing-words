import { Response } from 'express';

export const REFRESH_COOKIE_NAME = 'refresh_token';

// 30 days — kept in sync with REFRESH_TOKEN_TTL in auth.service.ts
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const IS_PROD = process.env.NODE_ENV === 'production';
// SameSite=None is required for cross-origin requests (frontend/backend on separate subdomains).
// Requires Secure=true, which IS_PROD enforces. In dev, Lax is fine via the Vite proxy.
const SAME_SITE: 'none' | 'lax' = IS_PROD ? 'none' : 'lax';

// Restrict cookie to auth routes so it is not sent with every API request.
// NOTE: if existing users have a cookie set with path '/', they must log in
// again once (the old cookie simply won't be sent to /api/auth and will expire).
const BASE_OPTS = {
  httpOnly: true,
  sameSite: SAME_SITE,
  secure: IS_PROD,
  path: '/api/auth',
} as const;

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, { ...BASE_OPTS, maxAge: REFRESH_TTL_MS });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, BASE_OPTS);
}
