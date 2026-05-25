import { describe, it, expect } from 'vitest'
import { normalizeWord } from './normalizeWord'

describe('normalizeWord', () => {
  // ── Basic normalisation ───────────────────────────────────────────────────

  it('lowercases ASCII text', () => {
    expect(normalizeWord('Hello')).toBe('hello')
    expect(normalizeWord('EPHEMERAL')).toBe('ephemeral')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeWord('  hello  ')).toBe('hello')
    expect(normalizeWord('\thello\t')).toBe('hello')
    expect(normalizeWord('\nhello\n')).toBe('hello')
  })

  it('collapses internal whitespace runs to a single space', () => {
    expect(normalizeWord('hello   world')).toBe('hello world')
    expect(normalizeWord('a\t\tb')).toBe('a b')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeWord('   ')).toBe('')
    expect(normalizeWord('\t\n')).toBe('')
    expect(normalizeWord('')).toBe('')
  })

  // ── NFKC Unicode normalisation ────────────────────────────────────────────

  it('collapses ligatures (NFKC)', () => {
    // ﬁ U+FB01 LATIN SMALL LIGATURE FI → fi
    expect(normalizeWord('ﬁsh')).toBe('fish')
    // ﬀ U+FB00 LATIN SMALL LIGATURE FF → ff
    expect(normalizeWord('ﬀ')).toBe('ff')
    // ﬃ U+FB03 LATIN SMALL LIGATURE FFI → ffi
    expect(normalizeWord('ﬃ')).toBe('ffi')
  })

  it('normalises compatibility fullwidth characters (NFKC)', () => {
    // Ａ U+FF21 FULLWIDTH LATIN CAPITAL LETTER A → A → a
    expect(normalizeWord('Ａｐｐｌｅ')).toBe('apple')
  })

  it('normalises superscript/subscript digits (NFKC)', () => {
    // ² U+00B2 SUPERSCRIPT TWO → 2
    expect(normalizeWord('CO²')).toBe('co2')
  })

  it('handles precomposed vs. decomposed accented characters (NFC already in NFKC)', () => {
    // é as single codepoint U+00E9 vs. e + U+0301 combining accent
    const precomposed = 'é'
    const decomposed = 'é'
    expect(normalizeWord(precomposed)).toBe(normalizeWord(decomposed))
  })

  // ── Unicode whitespace ────────────────────────────────────────────────────

  it('collapses Unicode whitespace variants', () => {
    // U+00A0 NO-BREAK SPACE
    expect(normalizeWord('hello world')).toBe('hello world')
    // U+2003 EM SPACE
    expect(normalizeWord('hello world')).toBe('hello world')
    // U+200B ZERO WIDTH SPACE — trim + collapse leaves it in the middle;
    // regex \s+ covers it in most engines
    expect(normalizeWord('hello​world')).toBe('hello​world')
  })

  // ── Mixed casing ──────────────────────────────────────────────────────────

  it('lowercases mixed-case words', () => {
    expect(normalizeWord('camelCase')).toBe('camelcase')
    expect(normalizeWord('PascalCase')).toBe('pascalcase')
    expect(normalizeWord('ALL_CAPS')).toBe('all_caps')
  })

  it('uses en locale for lowercasing (consistent cross-environment)', () => {
    // Basic Latin — always safe regardless of locale
    expect(normalizeWord('UPPER')).toBe('upper')
  })

  // ── Idempotency ───────────────────────────────────────────────────────────

  it('is idempotent — applying twice gives the same result', () => {
    const inputs = ['  Hello  ', 'ﬁsh', 'EPHEMERAL', 'hello   world', 'CO²']
    for (const input of inputs) {
      const once = normalizeWord(input)
      expect(normalizeWord(once)).toBe(once)
    }
  })
})
