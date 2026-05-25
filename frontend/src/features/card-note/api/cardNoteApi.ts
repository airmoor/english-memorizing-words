import { apiClient } from '../../../shared/api/base'

/*
 * Three mismatches fixed vs the previous implementation:
 *
 *   1. Path:   /cards/:id/notes           → /vocabulary/cards/:id/note
 *              ↑ wrong prefix, plural        ↑ correct prefix, singular
 *
 *   2. Method: PATCH                      → PUT
 *              ↑ not registered              ↑ backend uses PUT (upsert)
 *
 *   3. Body:   { notes: string }          → { body: string }
 *              ↑ wrong field name            ↑ UpsertNoteDto.body
 */

export interface UpsertNoteDto {
  body: string
}

export interface CardNoteResponse {
  cardId: string
  body: string
  updatedAt: string
}

export const upsertCardNote = (
  cardId: string,
  dto: UpsertNoteDto,
): Promise<CardNoteResponse | null> =>
  apiClient.put(`/vocabulary/cards/${cardId}/note`, dto)
