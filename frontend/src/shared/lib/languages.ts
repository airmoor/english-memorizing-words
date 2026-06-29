/**
 * Languages offered as a native-language choice. Codes are ISO 639-1, lowercased.
 * Kept in sync with the translation provider's supported targets (DeepL today).
 * Labels are shown in the language's own script for instant recognition.
 */
export interface LanguageOption {
  code: string
  /** Endonym — the language's name in its own language. */
  label: string
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'uk', label: 'Українська' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'pl', label: 'Polski' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'cs', label: 'Čeština' },
  { code: 'sv', label: 'Svenska' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
]

const LABEL_BY_CODE = new Map(SUPPORTED_LANGUAGES.map((l) => [l.code, l.label]))

/** Human label for a code, falling back to the uppercased code itself. */
export function languageLabel(code: string): string {
  return LABEL_BY_CODE.get(code) ?? code.toUpperCase()
}
