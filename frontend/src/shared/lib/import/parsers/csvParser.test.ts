import { describe, it, expect } from 'vitest'
import { csvParser } from './csvParser'

describe('csvParser', () => {
  // ── score ─────────────────────────────────────────────────────────────────

  describe('score', () => {
    it('returns 1.0 for .csv filename', () => {
      expect(csvParser.score({ text: 'word,tag', filename: 'words.csv' })).toBe(1.0)
    })

    it('returns 0 for .txt filename', () => {
      expect(csvParser.score({ text: 'hello', filename: 'words.txt' })).toBe(0)
    })

    it('returns non-zero when majority of lines are comma-delimited', () => {
      const text = 'apple,botany\nbanana,food\ncherry,food'
      expect(csvParser.score({ text })).toBeGreaterThan(0)
    })

    it('returns 0 for plain text with no delimiters', () => {
      expect(csvParser.score({ text: 'apple\nbanana\ncherry' })).toBe(0)
    })
  })

  // ── parse — word-only CSV ─────────────────────────────────────────────────

  describe('parse — word-only CSV', () => {
    it('parses a single-column CSV with "word" header', async () => {
      const text = 'word\napple\nbanana\ncherry'
      const result = await csvParser.parse({ text, filename: 'words.csv' })
      expect(result.rows).toHaveLength(3)
      expect(result.rows.map((r) => r.word)).toEqual(['apple', 'banana', 'cherry'])
      expect(result.rows.every((r) => r.status === 'valid')).toBe(true)
    })

    it('single-column fallback: no recognised header → treats all lines as words', async () => {
      const text = 'apple\nbanana\ncherry'
      const result = await csvParser.parse({ text, filename: 'words.csv' })
      expect(result.rows.length).toBeGreaterThan(0)
    })
  })

  // ── parse — full 4-column CSV ─────────────────────────────────────────────

  describe('parse — full 4-column CSV', () => {
    it('parses word, tags, board, notes columns', async () => {
      const text = 'word,tags,board,notes\nephemeral,adjective;academic,Literature,Short-lived\ntransient,adjective,,'
      const result = await csvParser.parse({ text, filename: 'vocab.csv' })

      expect(result.rows).toHaveLength(2)

      const [row1, row2] = result.rows
      expect(row1.word).toBe('ephemeral')
      expect(row1.tags).toEqual(['adjective', 'academic'])
      expect(row1.board).toBe('Literature')
      expect(row1.notes).toBe('Short-lived')

      expect(row2.word).toBe('transient')
      expect(row2.tags).toEqual(['adjective'])
      expect(row2.board).toBeUndefined()
      expect(row2.notes).toBeUndefined()
    })

    it('handles column order variation', async () => {
      const text = 'board,word,notes,tags\nNature,ephemeral,note1,botany'
      const result = await csvParser.parse({ text, filename: 'vocab.csv' })
      expect(result.rows[0].word).toBe('ephemeral')
      expect(result.rows[0].board).toBe('Nature')
      expect(result.rows[0].notes).toBe('note1')
      expect(result.rows[0].tags).toEqual(['botany'])
    })
  })

  // ── parse — empty word cell ───────────────────────────────────────────────

  describe('parse — empty word cell', () => {
    it('skips rows with empty word column', async () => {
      const text = 'word,tags\napple,food\n,botany\nbanana,food'
      const result = await csvParser.parse({ text, filename: 'words.csv' })
      // Row with empty word should be skipped
      expect(result.rows.every((r) => r.word.length > 0)).toBe(true)
      expect(result.rows).toHaveLength(2)
    })
  })

  // ── parse — CRLF line endings ─────────────────────────────────────────────

  describe('parse — CRLF endings', () => {
    it('handles \\r\\n line endings', async () => {
      const text = 'word\r\napple\r\nbanana\r\n'
      const result = await csvParser.parse({ text, filename: 'words.csv' })
      expect(result.rows.map((r) => r.word)).toEqual(['apple', 'banana'])
    })
  })

  // ── parse — row limit ─────────────────────────────────────────────────────

  describe('parse — >500 row truncation', () => {
    it('truncates to 500 rows and adds a warning', async () => {
      const lines = ['word', ...Array.from({ length: 600 }, (_, i) => `word${i}`)]
      const text  = lines.join('\n')
      const result = await csvParser.parse({ text, filename: 'large.csv' })
      expect(result.rows.length).toBeLessThanOrEqual(500)
      expect(result.warnings?.some((w) => w.includes('500'))).toBe(true)
    })
  })

  // ── parse — single-column fallback ───────────────────────────────────────

  describe('parse — single-column fallback', () => {
    it('parses as word-per-line when 1 column and no recognised header', async () => {
      const text = 'x\napple\nbanana'
      const result = await csvParser.parse({ text, filename: 'words.csv' })
      // Even with unknown header, words should be parsed
      expect(result.rows.length).toBeGreaterThan(0)
    })
  })

  // ── parse — semicolon tag splitting ──────────────────────────────────────

  describe('parse — semicolon tag splitting', () => {
    it('splits tags on semicolons and normalises each tag', async () => {
      const text = 'word,tags\napple," Fruit ; Food ; HEALTHY "'
      const result = await csvParser.parse({ text, filename: 'words.csv' })
      expect(result.rows[0].tags).toEqual(['fruit', 'food', 'healthy'])
    })

    it('ignores empty tag segments', async () => {
      const text = 'word,tags\napple,;food;;'
      const result = await csvParser.parse({ text, filename: 'words.csv' })
      expect(result.rows[0].tags).toEqual(['food'])
    })
  })

  // ── parse — within-batch deduplication ───────────────────────────────────

  describe('parse — within-batch deduplication', () => {
    it('marks duplicate words as duplicate_within_batch', async () => {
      const text = 'word\napple\nbanana\napple'
      const result = await csvParser.parse({ text, filename: 'words.csv' })
      expect(result.rows[0].status).toBe('valid')
      expect(result.rows[2].status).toBe('duplicate_within_batch')
    })
  })

  // ── parse — clientRowId ───────────────────────────────────────────────────

  describe('parse — clientRowId', () => {
    it('assigns a unique clientRowId to every row', async () => {
      const text = 'word\napple\nbanana\ncherry'
      const result = await csvParser.parse({ text, filename: 'words.csv' })
      const ids = result.rows.map((r) => r.clientRowId)
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })
})
