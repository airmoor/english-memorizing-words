let token: string | null = null
let subscriber: ((t: string | null) => void) | null = null

export const tokenStore = {
  get: (): string | null => token,
  set: (t: string): void => {
    token = t
    subscriber?.(t)
  },
  clear: (): void => {
    token = null
    subscriber?.(null)
  },
  // Single subscriber — authStore registers here so base.ts stays in shared/
  subscribe: (fn: (t: string | null) => void): void => {
    subscriber = fn
  },
}
