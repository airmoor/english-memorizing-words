import { apiClient } from '../../../shared/api/base'
import type { CardAnswer } from '../../../entities/review/model/types'

export const getAnswer = (cardId: string) =>
  apiClient.get<CardAnswer>(`/reviews/answer/${cardId}`)
