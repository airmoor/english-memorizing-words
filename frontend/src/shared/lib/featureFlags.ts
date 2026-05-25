/**
 * Feature flags — read from Vite environment variables at build time.
 *
 * To disable the boards/tags UI without touching code:
 *   VITE_BOARDS_TAGS_ENABLED=false npm run build
 *
 * Default: enabled (undefined → true).
 */

export const featureFlags = {
  /**
   * Controls all Boards & Tags UI: filter chips, card chips, card detail
   * sections, board management, tag management, and the meaning picker.
   * Set VITE_BOARDS_TAGS_ENABLED=false to hide entirely.
   */
  boardsTags: import.meta.env.VITE_BOARDS_TAGS_ENABLED !== 'false',
} as const
