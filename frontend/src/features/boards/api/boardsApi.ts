import { apiClient } from '../../../shared/api/base'
import type { Board } from '../../../entities/board/model/types'

export interface CreateBoardDto {
  name: string
  description?: string
}

export interface UpdateBoardDto {
  name?: string
  description?: string
  position?: number
  isArchived?: boolean
}

export const fetchBoards = (includeArchived = false): Promise<{ boards: Board[] }> =>
  apiClient.get(`/boards${includeArchived ? '?includeArchived=true' : ''}`)

export const createBoard = (dto: CreateBoardDto): Promise<Board> =>
  apiClient.post('/boards', dto)

export const updateBoard = (id: string, dto: UpdateBoardDto): Promise<Board> =>
  apiClient.patch(`/boards/${id}`, dto)

export const deleteBoard = (id: string): Promise<void> =>
  apiClient.delete(`/boards/${id}`)

export const assignCardToBoard = (
  boardId: string,
  cardId: string,
): Promise<{ assigned: boolean; assignedAt: string }> =>
  apiClient.post(`/boards/${boardId}/cards/${cardId}`)

export const removeCardFromBoard = (
  boardId: string,
  cardId: string,
): Promise<{ removed: boolean }> =>
  apiClient.delete(`/boards/${boardId}/cards/${cardId}`)
