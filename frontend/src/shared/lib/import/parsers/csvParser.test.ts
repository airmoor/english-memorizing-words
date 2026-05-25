import { describe, it, expect } from 'vitest'
import { csvParser } from './csvParser'

describe('csvParser', () => {
  // ── canParse ──────────────────────────────────────────────────────────────

  describe('canParse', () => {
    it('returns true for .csv filename', () => {
      expect(csvParser.canParse({ text: 'word,tag', filename: 'words.csv' })).toBe(true)
    })

    it('returns false for .txt filename', () => {
      expect(csvParser.canParse({ text: 'hello', filename: 'words.txt' })).toBe(false)
    })

    it('returns true when majority of lines are comma-delimited', () => {
      const text = 'apple,botany\nbanana,food\ncherry,food'
      expect(csvParser.canParse({ text })).toBe(true)
    })
  })

  // ── parse — word-only CSV ─────────────────────────────────────────────────

  describe('parse — word-only CSV', () => {
    it('parses a single-column CSV with "word" header', () => {
      const text = 'word\napple\nbanana\ncherry'
      const result = csvParser.parse({ text, filename: 'words.csv' })
      expect(result.rows).toHaveLength(3)
      expect(result.rows.map((r) => r.word)).toEqual(['apple', 'banana', 'cherry'])
      expect(result.rows.every((r) => r.status === 'valid')).toBe(true)
    })

    it('single-column fallback: no recognised header → treats all lines as words', () => {
      const text = 'apple\nbanana\ncherry'
      const result = csvParser.parse({ text, filename: 'words.csv' })
      expect(result.rows.length).toBeGreaterThan(0)
    })
  })

  // ── parse — full 4-column CSV ─────────────────────────────────────────────

  describe('parse — full 4-column CSV', () => {
    it('parses word, tags, board, notes columns', () => {
      const text = 'word,tags,board,notes\nephemeral,adjective;academic,Literature,Short-lived\ntransient,adjective,,'
      const result = csvParser.parse({ text, filename: 'vocab.csv' })

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

    it('handles column order variation', () => {
      const text = 'board,word,notes,tags\nNature,ephemeral,note1,botany'
      const result = csvParser.parse({ text, filename: 'vocab.csv' })
      expect(result.rows[0].word).toBe('ephemeral')
      expect(result.rows[0].board).toBe('Nature')
      expect(result.rows[0].notes).toBe('note1')
      expect(result.rows[0].tags).toEqual(['botany'])
    })
  })

  // ── parse — empty word cell ───────────────────────────────────────────────

  describe('parse — empty word cell', () => {
    it('skips rows with empty word column', () => {
      const text = 'word,tags\napple,food\n,botany\nbanana,food'
      const result = csvParser.parse({ text, filename: 'words.csv' })
      // Row with empty word should be skipped
      expect(result.rows.every((r) => r.word.length > 0)).toBe(true)
      expect(result.rows).toHaveLength(2)
    })
  })

  // ── parse — CRLF line endings ─────────────────────────────────────────────

  describe('parse — CRLF endings', () => {
    it('handles \\r\\n line endings', () => {
      const text = 'word\r\napple\r\nbanana\r\n'
      const result = csvParser.parse({ text, filename: 'words.csv' })
      expect(result.rows.map((r) => r.word)).toEqual(['apple', 'banana'])
    })
  })

  // ── parse — row limit ─────────────────────────────────────────────────────

  describe('parse — >500 row truncation', () => {
    it('truncates to 500 rows and adds a warning', () => {
      const lines = ['word', ...Array.from({ length: 600 }, (_, i) => `word${i}`)]
      const text = lines.join('\n')
      const result = csvParser.parse({ text, filename: 'large.csv' })
      expect(result.rows.length).toBeLessThanOrEqual(500)
      expect(result.warnings?.some((w) => w.includes('500'))).toBe(true)
    })
  })

  // ── parse — single-column fallback ───────────────────────────────────────

  describe('parse — single-column fallback', () => {
    it('parses as word-per-line when 1 column and no recognised header', () => {
      const text = 'x\napple\nbanana'
      const result = csvParser.parse({ text, filename: 'words.csv' })
      // Even with unknown header, words should be parsed
      expect(result.rows.length).toBeGreaterThan(0)
    })
  })

  // ── parse — semicolon tag splitting ──────────────────────────────────────

  describe('parse — semicolon tag splitting', () => {
    it('splits tags on semicolons and normalises each tag', () => {
      const text = 'word,tags\napple," Fruit ; Food ; HEALTHY "'
      const result = csvParser.parse({ text, filename: 'words.csv' })
      expect(result.rows[0].tags).toEqual(['fruit', 'food', 'healthy'])
    })

    it('ignores empty tag segments', () => {
      const text = 'word,tags\napple,;food;;'
      const result = csvParser.parse({ text, filename: 'words.csv' })
      expect(result.rows[0].tags).toEqual(['food'])
    })
  })

  // ── parse — within-batch deduplication ───────────────────────────────────

  describe('parse — within-batch deduplication', () => {
    it('marks duplicate words as duplicate_within_batch', () => {
      const text = 'word\napple\nbanana\napple'
      const result = csvParser.parse({ text, filename: 'words.csv' })
      expect(result.rows[0].status).toBe('valid')
      expect(result.rows[2].status).toBe('duplicate_within_batch')
    })
  })
})
