import { apiClient } from '../../../shared/api/base'
import type { Rating, ReviewResult } from '../../../shared/types'

export const submitRating = (cardId: string, rating: Rating) =>
  apiClient.post<ReviewResult>(`/reviews/${cardId}`, { rating })
