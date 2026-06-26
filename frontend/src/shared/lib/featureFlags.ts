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

  /**
   * Controls the vocabulary import feature (bulk import from TXT/CSV/Anki).
   * Enabled by default in development. Set VITE_IMPORT_ENABLED=false to hide.
   */
  vocabularyImport: import.meta.env.VITE_IMPORT_ENABLED !== 'false',

  /**
   * Legacy decorative themes (sepia, marshmallow, neon, sakura, etc.).
   * The calm/neutral redesign ships a single dark + light system; the 9
   * decorative variants are archived behind this flag (default OFF).
   * Set VITE_LEGACY_THEMES_ENABLED=true to restore the full variant picker.
   */
  legacyThemes: import.meta.env.VITE_LEGACY_THEMES_ENABLED === 'true',
} as const
