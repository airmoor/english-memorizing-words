import { apiClient } from '../../../shared/api/base'
import type { Rating, ReviewResult } from '../../../entities/review/model/types'

export const submitRating = (cardId: string, rating: Rating, answerText?: string) =>
  apiClient.post<ReviewResult>(`/reviews/${cardId}`, { rating, answerText })
