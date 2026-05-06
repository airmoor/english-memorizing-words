let token: string | null = null

export const tokenStore = {
  get: (): string | null => token,
  set: (t: string): void => { token = t },
  clear: (): void => { token = null },
}
