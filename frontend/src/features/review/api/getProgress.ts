import { apiClient } from '../../../shared/api/base'
import type { ReviewProgress } from '../../../entities/review/model/types'

export const getProgress = () => apiClient.get<ReviewProgress>('/reviews/progress')
