import { apiClient } from '../../../shared/api/base'
import type { CardAnswer } from '../../../shared/types'

export const getAnswer = (cardId: string) =>
  apiClient.get<CardAnswer>(`/reviews/answer/${cardId}`)
