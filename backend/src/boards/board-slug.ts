import { randomBytes } from 'crypto';

/**
 * Generates a URL-safe random share slug — not derived from the board name
 * (names collide across users and can contain anything unsafe for a URL).
 * 9 random bytes -> 12 base64url characters, ~72 bits of entropy: large
 * enough that guessing is impractical even without the rate limit on the
 * public read route, which exists as defense in depth.
 */
export function generateShareSlug(): string {
  return randomBytes(9).toString('base64url');
}
