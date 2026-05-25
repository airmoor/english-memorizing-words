import { describe, it, expect } from 'vitest'
import { txtParser } from './txtParser'

describe('txtParser', () => {
  // ── score ─────────────────────────────────────────────────────────────────

  describe('score', () => {
    it('returns 0.8 for .txt filename', () => {
      expect(txtParser.score({ text: 'hello\nworld', filename: 'words.txt' })).toBe(0.8)
    })

    it('returns 0 for .csv filename', () => {
      expect(txtParser.score({ text: 'word,tag', filename: 'words.csv' })).toBe(0)
    })

    it('returns non-zero for plain text with no filename', () => {
      expect(txtParser.score({ text: 'apple\nbanana\ncherry' })).toBeGreaterThan(0)
    })

    it('returns non-zero for empty input (fallback)', () => {
      expect(txtParser.score({ text: '' })).toBeGreaterThan(0)
    })

    it('returns 0 for comma-heavy content (defers to csvParser)', () => {
      const text = 'apple,tag\nbanana,food\ncherry,food'
      expect(txtParser.score({ text })).toBe(0)
    })
  })

  // ── parse — empty and whitespace ─────────────────────────────────────────

  describe('parse — empty and whitespace', () => {
    it('returns empty rows for empty input', async () => {
      const result = await txtParser.parse({ text: '' })
      expect(result.rows).toHaveLength(0)
    })

    it('filters whitespace-only lines', async () => {
      const result = await txtParser.parse({ text: '  \n   \n\t\n' })
      expect(result.rows).toHaveLength(0)
    })

    it('filters blank lines between words', async () => {
      const result = await txtParser.parse({ text: 'apple\n\nbanana\n\ncherry' })
      expect(result.rows).toHaveLength(3)
      expect(result.rows.map((r) => r.word)).toEqual(['apple', 'banana', 'cherry'])
    })
  })

  // ── parse — normalisation ─────────────────────────────────────────────────

  describe('parse — normalisation', () => {
    it('trims and lowercases words', async () => {
      const result = await txtParser.parse({ text: '  APPLE  \n  Banana ' })
      expect(result.rows[0].word).toBe('apple')
      expect(result.rows[1].word).toBe('banana')
    })

    it('strips CRLF line endings', async () => {
      const result = await txtParser.parse({ text: 'apple\r\nbanana\r\n' })
      expect(result.rows).toHaveLength(2)
      expect(result.rows[0].word).toBe('apple')
      expect(result.rows[1].word).toBe('banana')
    })
  })

  // ── parse — lineNumber and rawText ────────────────────────────────────────

  describe('parse — lineNumber and rawText', () => {
    it('populates lineNumber (1-based) and rawText on every row', async () => {
      const result = await txtParser.parse({ text: 'apple\nbanana\ncherry' })

      expect(result.rows[0].lineNumber).toBe(1)
      expect(result.rows[0].rawText).toBe('apple')

      expect(result.rows[1].lineNumber).toBe(2)
      expect(result.rows[1].rawText).toBe('banana')

      expect(result.rows[2].lineNumber).toBe(3)
      expect(result.rows[2].rawText).toBe('cherry')
    })

    it('lineNumber accounts for blank lines', async () => {
      const result = await txtParser.parse({ text: 'apple\n\nbanana' })
      // apple is line 1, banana is line 3
      expect(result.rows[0].lineNumber).toBe(1)
      expect(result.rows[1].lineNumber).toBe(3)
    })

    it('preserves rawText with original casing before normalisation', async () => {
      const result = await txtParser.parse({ text: '  APPLE  ' })
      expect(result.rows[0].rawText).toBe('  APPLE  ')
      expect(result.rows[0].word).toBe('apple')
    })
  })

  // ── parse — clientRowId ───────────────────────────────────────────────────

  describe('parse — clientRowId', () => {
    it('assigns a unique clientRowId (UUID) to every row', async () => {
      const result = await txtParser.parse({ text: 'apple\nbanana\ncherry' })
      const ids = result.rows.map((r) => r.clientRowId)
      // All defined
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
      // All unique
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  // ── parse — within-batch deduplication ────────────────────────────────────

  describe('parse — within-batch deduplication', () => {
    it('marks subsequent occurrences as duplicate_within_batch', async () => {
      const result = await txtParser.parse({ text: 'apple\nbanana\napple' })

      expect(result.rows[0].status).toBe('valid')
      expect(result.rows[1].status).toBe('valid')
      expect(result.rows[2].status).toBe('duplicate_within_batch')
    })

    it('reason cites the line number of the first occurrence', async () => {
      const result = await txtParser.parse({ text: 'apple\nbanana\napple' })
      expect(result.rows[2].reason).toBe('Already in this list (line 1)')
    })

    it('first occurrence is always valid regardless of position', async () => {
      const result = await txtParser.parse({ text: 'apple\napple\napple' })
      expect(result.rows[0].status).toBe('valid')
      expect(result.rows[1].status).toBe('duplicate_within_batch')
      expect(result.rows[2].status).toBe('duplicate_within_batch')
      // All subsequent occurrences cite line 1
      expect(result.rows[1].reason).toBe('Already in this list (line 1)')
      expect(result.rows[2].reason).toBe('Already in this list (line 1)')
    })

    it('deduplication is case-insensitive (after normalisation)', async () => {
      const result = await txtParser.parse({ text: 'Apple\nAPPLE\napple' })
      expect(result.rows[0].status).toBe('valid')
      expect(result.rows[1].status).toBe('duplicate_within_batch')
      expect(result.rows[2].status).toBe('duplicate_within_batch')
    })
  })

  // ── parse — valid status ──────────────────────────────────────────────────

  describe('parse — valid rows', () => {
    it('sets status to valid for unique words', async () => {
      const result = await txtParser.parse({ text: 'apple\nbanana\ncherry' })
      expect(result.rows.every((r) => r.status === 'valid')).toBe(true)
    })
  })
})
