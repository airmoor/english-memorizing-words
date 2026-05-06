import { apiClient } from '../../../shared/api/base'
import type { ReviewProgress } from '../../../shared/types'

export const getProgress = () => apiClient.get<ReviewProgress>('/reviews/progress')
