import { describe, it, expect } from 'vitest'
import { ankiParser } from './ankiParser'

describe('ankiParser', () => {
  // ── score ─────────────────────────────────────────────────────────────────

  describe('score', () => {
    it('returns non-zero for tab-separated two-column input', () => {
      const text = 'apple\tdefinition of apple\nbanana\tdefinition of banana'
      expect(ankiParser.score({ text })).toBeGreaterThan(0)
    })

    it('returns 0 for single-column plain text', () => {
      const text = 'apple\nbanana\ncherry'
      expect(ankiParser.score({ text })).toBe(0)
    })

    it('returns 0 for CSV with a recognised header ("word")', () => {
      const text = 'word,tags\napple,food\nbanana,food'
      expect(ankiParser.score({ text })).toBe(0)
    })

    it('returns 0 for .txt files', () => {
      const text = 'apple\tdef\nbanana\tdef'
      expect(ankiParser.score({ text, filename: 'notes.txt' })).toBe(0)
    })

    it('returns non-zero for multi-column CSV without recognised header', () => {
      const text = 'front,back,extra\napple,a fruit,noun\nbanana,yellow,noun'
      expect(ankiParser.score({ text })).toBeGreaterThan(0)
    })

    it('scores tab-separated higher than multi-column comma CSV', () => {
      const tabText  = 'apple\tA round fruit\nbanana\tA yellow fruit'
      const csvText  = 'front,back\napple,a fruit\nbanana,yellow'
      expect(ankiParser.score({ text: tabText })).toBeGreaterThan(ankiParser.score({ text: csvText }))
    })
  })

  // ── parse — requiresColumnMapping ────────────────────────────────────────

  describe('parse — without columnMap', () => {
    it('returns requiresColumnMapping: true when no columnMap provided', async () => {
      const text   = 'apple\tdefinition\nbanana\tdefinition'
      const result = await ankiParser.parse({ text })
      expect(result.requiresColumnMapping).toBe(true)
      expect(result.rows).toHaveLength(0)
    })

    it('returns columnSuggestions when requiresColumnMapping is true', async () => {
      const text   = 'apple\tthis is a longer description of apple\nbanana\tthis is a longer description of banana'
      const result = await ankiParser.parse({ text })
      expect(result.columnSuggestions).toBeDefined()
      expect(result.columnSuggestions!.length).toBeGreaterThan(0)
    })
  })

  // ── column heuristic ──────────────────────────────────────────────────────

  describe('column heuristic', () => {
    it('suggests the column with shorter median length as the word column', async () => {
      // Col 0: short words (apple, banana) → should be highest confidence
      // Col 1: long definitions → lower confidence
      const text   = 'apple\tThis is a long definition about apples and fruit\nbanana\tThis is a long definition about bananas and yellow fruit'
      const result = await ankiParser.parse({ text })
      const topSuggestion = result.columnSuggestions![0]
      expect(topSuggestion.index).toBe(0)
    })
  })

  // ── parse — with columnMap ────────────────────────────────────────────────

  describe('parse — with columnMap', () => {
    it('parses words from the specified column', async () => {
      // Real Anki exports have no header row — raw data only
      const text   = 'apple\tA round fruit\nbanana\tA yellow fruit'
      const result = await ankiParser.parse({ text }, { wordColumnIndex: 0 })
      expect(result.requiresColumnMapping).toBe(false)
      expect(result.rows).toHaveLength(2)
      expect(result.rows.map((r) => r.word)).toEqual(['apple', 'banana'])
    })

    it('normalises words (trim + lowercase)', async () => {
      const text   = 'APPLE\tdef\n  Banana  \tdef'
      const result = await ankiParser.parse({ text }, { wordColumnIndex: 0 })
      expect(result.rows.map((r) => r.word)).toEqual(['apple', 'banana'])
    })

    it('includes lineNumber and rawText on every row', async () => {
      const text   = 'apple\tdef\nbanana\tdef'
      const result = await ankiParser.parse({ text }, { wordColumnIndex: 0 })
      expect(result.rows[0].lineNumber).toBeDefined()
      expect(result.rows[0].rawText).toBeDefined()
    })

    it('assigns a unique clientRowId to every row', async () => {
      const text   = 'apple\tdef\nbanana\tdef'
      const result = await ankiParser.parse({ text }, { wordColumnIndex: 0 })
      const ids    = result.rows.map((r) => r.clientRowId)
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('marks within-batch duplicates', async () => {
      const text   = 'apple\tdef1\nbanana\tdef2\napple\tdef3'
      const result = await ankiParser.parse({ text }, { wordColumnIndex: 0 })
      expect(result.rows[0].status).toBe('valid')
      expect(result.rows[2].status).toBe('duplicate_within_batch')
    })
  })

  // ── Anki tags column ──────────────────────────────────────────────────────

  describe('parse — tags column', () => {
    it('splits Anki tags on spaces and normalises each', async () => {
      const text   = 'apple\tFOOD FRUIT nature'
      const result = await ankiParser.parse({ text }, { wordColumnIndex: 0, tagsColumnIndex: 1 })
      expect(result.rows[0].tags).toEqual(['food', 'fruit', 'nature'])
    })

    it('returns undefined tags when tags column not mapped', async () => {
      const text   = 'apple\tFOOD FRUIT'
      const result = await ankiParser.parse({ text }, { wordColumnIndex: 0 })
      expect(result.rows[0].tags).toBeUndefined()
    })
  })
})
