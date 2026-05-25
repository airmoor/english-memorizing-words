import { apiClient } from '../../../shared/api/base'
import type { NextCard } from '../../../entities/review/model/types'

export const getNextCard = (boardId?: string) => {
  const url = boardId
    ? `/reviews/next?boardId=${encodeURIComponent(boardId)}`
    : '/reviews/next'
  return apiClient.get<NextCard | null>(url)
}
