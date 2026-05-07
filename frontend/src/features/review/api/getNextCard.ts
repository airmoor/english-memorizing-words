import { apiClient } from '../../../shared/api/base'
import type { NextCard } from '../../../entities/review/model/types'

export const getNextCard = () => apiClient.get<NextCard | null>('/reviews/next')
