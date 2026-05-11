/**
 * Adapter functions that convert API DTOs into WordPayload / LearningState.
 *
 * These are the only places where VocabularyWord and WordResult are
 * translated into the WordDetail boundary types. Keeping them here —
 * not inside hooks or components — makes the conversions testable in
 * isolation and prevents the boundary types from leaking upstream.
 */

import type { VocabularyWord } from '../../../entities/vocabulary/model/types'
import type { WordResult } from '../../../entities/word/model/types'
import type { WordPayload, LearningState, MeaningPayload } from './types'

// ── VocabularyWord → WordPayload + LearningState ──────────────────────────

/**
 * Converts a VocabularyWord (enriched vocabulary API DTO) into the
 * WordPayload needed by WordDetailContent.
 *
 * Safe to call only after P1.T2 backend enrichment — requires the
 * `provider`, `synonyms`, and `examples` fields added in that task.
 */
export function vocabWordToWordPayload(v: VocabularyWord): WordPayload {
  const meanings: MeaningPayload[] = v.meanings.map((m) => ({
    id: m.id,
    definition: m.definition,
    partOfSpeech: m.partOfSpeech,
    senseNumber: m.senseNumber,
    synonyms: m.synonyms,
    examples: m.examples,
  }))

  return {
    id: v.wordId,
    text: v.wordText,
    transcription: v.transcription,
    provider: v.provider as WordPayload['provider'],
    meanings,
  }
}

/**
 * Extracts LearningState from a VocabularyWord.
 * Returns null when card state fields are absent (e.g. no card exists).
 */
export function vocabWordToLearningState(v: VocabularyWord): LearningState | null {
  if (v.nextReview === null || v.intervalDays === null || v.easeFactor === null) {
    return null
  }
  return {
    nextReview: v.nextReview,
    lastReviewedAt: v.lastReviewedAt,
    intervalDays: v.intervalDays,
    easeFactor: v.easeFactor,
  }
}

// ── WordResult → WordPayload ───────────────────────────────────────────────

/**
 * Converts a WordResult (search API DTO) into WordPayload.
 * WordResult and WordPayload are structurally identical — this is an
 * explicit adapter so the conversion is visible and auditable.
 */
export function wordResultToWordPayload(w: WordResult): WordPayload {
  return {
    id: w.id,
    text: w.text,
    transcription: w.transcription,
    provider: w.provider,
    meanings: w.meanings.map((m) => ({
      id: m.id,
      definition: m.definition,
      partOfSpeech: m.partOfSpeech,
      senseNumber: m.senseNumber,
      synonyms: m.synonyms,
      examples: m.examples,
    })),
  }
}
