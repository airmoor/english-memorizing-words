import { apiClient } from '../../../shared/api/base'
import type { ReviewProgress } from '../../../entities/review/model/types'

export const getProgress = (boardId?: string) => {
  const url = boardId
    ? `/reviews/progress?boardId=${encodeURIComponent(boardId)}`
    : '/reviews/progress'
  return apiClient.get<ReviewProgress>(url)
}
