import { apiClient } from '../../../shared/api/base'
import type { NextCard } from '../../../shared/types'

export const getNextCard = () => apiClient.get<NextCard | null>('/reviews/next')
