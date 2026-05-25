import { describe, it, expect } from 'vitest'
import { txtParser } from './txtParser'

describe('txtParser', () => {
  // ── canParse ──────────────────────────────────────────────────────────────

  describe('canParse', () => {
    it('returns true for .txt filename', () => {
      expect(txtParser.canParse({ text: 'hello\nworld', filename: 'words.txt' })).toBe(true)
    })

    it('returns false for .csv filename', () => {
      expect(txtParser.canParse({ text: 'word,tag', filename: 'words.csv' })).toBe(false)
    })

    it('returns true for plain text with no filename', () => {
      expect(txtParser.canParse({ text: 'apple\nbanana\ncherry' })).toBe(true)
    })

    it('returns true for empty input', () => {
      expect(txtParser.canParse({ text: '' })).toBe(true)
    })
  })

  // ── parse — empty and whitespace ─────────────────────────────────────────

  describe('parse — empty and whitespace', () => {
    it('returns empty rows for empty input', () => {
      const result = txtParser.parse({ text: '' })
      expect(result.rows).toHaveLength(0)
    })

    it('filters whitespace-only lines', () => {
      const result = txtParser.parse({ text: '  \n   \n\t\n' })
      expect(result.rows).toHaveLength(0)
    })

    it('filters blank lines between words', () => {
      const result = txtParser.parse({ text: 'apple\n\nbanana\n\ncherry' })
      expect(result.rows).toHaveLength(3)
      expect(result.rows.map((r) => r.word)).toEqual(['apple', 'banana', 'cherry'])
    })
  })

  // ── parse — normalisation ─────────────────────────────────────────────────

  describe('parse — normalisation', () => {
    it('trims and lowercases words', () => {
      const result = txtParser.parse({ text: '  APPLE  \n  Banana ' })
      expect(result.rows[0].word).toBe('apple')
      expect(result.rows[1].word).toBe('banana')
    })

    it('strips CRLF line endings', () => {
      const result = txtParser.parse({ text: 'apple\r\nbanana\r\n' })
      expect(result.rows).toHaveLength(2)
      expect(result.rows[0].word).toBe('apple')
      expect(result.rows[1].word).toBe('banana')
    })
  })

  // ── parse — lineNumber and rawText ────────────────────────────────────────

  describe('parse — lineNumber and rawText', () => {
    it('populates lineNumber (1-based) and rawText on every row', () => {
      const result = txtParser.parse({ text: 'apple\nbanana\ncherry' })

      expect(result.rows[0].lineNumber).toBe(1)
      expect(result.rows[0].rawText).toBe('apple')

      expect(result.rows[1].lineNumber).toBe(2)
      expect(result.rows[1].rawText).toBe('banana')

      expect(result.rows[2].lineNumber).toBe(3)
      expect(result.rows[2].rawText).toBe('cherry')
    })

    it('lineNumber accounts for blank lines', () => {
      const result = txtParser.parse({ text: 'apple\n\nbanana' })
      // apple is line 1, banana is line 3
      expect(result.rows[0].lineNumber).toBe(1)
      expect(result.rows[1].lineNumber).toBe(3)
    })

    it('preserves rawText with original casing before normalisation', () => {
      const result = txtParser.parse({ text: '  APPLE  ' })
      expect(result.rows[0].rawText).toBe('  APPLE  ')
      expect(result.rows[0].word).toBe('apple')
    })
  })

  // ── parse — within-batch deduplication ────────────────────────────────────

  describe('parse — within-batch deduplication', () => {
    it('marks subsequent occurrences as duplicate_within_batch', () => {
      const result = txtParser.parse({ text: 'apple\nbanana\napple' })

      expect(result.rows[0].status).toBe('valid')
      expect(result.rows[1].status).toBe('valid')
      expect(result.rows[2].status).toBe('duplicate_within_batch')
    })

    it('reason cites the line number of the first occurrence', () => {
      const result = txtParser.parse({ text: 'apple\nbanana\napple' })
      expect(result.rows[2].reason).toBe('Already in this list (line 1)')
    })

    it('first occurrence is always valid regardless of position', () => {
      const result = txtParser.parse({ text: 'apple\napple\napple' })
      expect(result.rows[0].status).toBe('valid')
      expect(result.rows[1].status).toBe('duplicate_within_batch')
      expect(result.rows[2].status).toBe('duplicate_within_batch')
      // All subsequent occurrences cite line 1
      expect(result.rows[1].reason).toBe('Already in this list (line 1)')
      expect(result.rows[2].reason).toBe('Already in this list (line 1)')
    })

    it('deduplication is case-insensitive (after normalisation)', () => {
      const result = txtParser.parse({ text: 'Apple\nAPPLE\napple' })
      expect(result.rows[0].status).toBe('valid')
      expect(result.rows[1].status).toBe('duplicate_within_batch')
      expect(result.rows[2].status).toBe('duplicate_within_batch')
    })
  })

  // ── parse — valid status ──────────────────────────────────────────────────

  describe('parse — valid rows', () => {
    it('sets status to valid for unique words', () => {
      const result = txtParser.parse({ text: 'apple\nbanana\ncherry' })
      expect(result.rows.every((r) => r.status === 'valid')).toBe(true)
    })
  })
})
