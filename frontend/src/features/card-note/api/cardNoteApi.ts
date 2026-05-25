import { apiClient } from '../../../shared/api/base'

export interface UpdateNoteDto {
  notes: string
}

export interface CardNoteResponse {
  cardId: string
  notes: string
  updatedAt: string
}

export const updateCardNote = (
  cardId: string,
  dto: UpdateNoteDto,
): Promise<CardNoteResponse> =>
  apiClient.patch(`/cards/${cardId}/notes`, dto)
