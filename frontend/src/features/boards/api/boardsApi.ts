import { apiClient } from '../../../shared/api/base'
import type { Board, BoardVisibility, SharedBoard } from '../../../entities/board/model/types'

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

/*
 * GET /boards returns Board[] directly — NOT { boards: Board[] }.
 * The previous type annotation was wrong, causing .then((r) => r.boards)
 * to evaluate to undefined at runtime → empty list → "No boards yet."
 *
 * apiClient resolves an empty 2xx body (e.g. Content-Length: 0) to `null`
 * (see shared/api/base.ts) — that's a valid contract for single-resource
 * endpoints, but this is a list endpoint typed Board[], so coerce it to []
 * here rather than leaking `null` into a value every caller treats as an array.
 */
export const fetchBoards = async (includeArchived = false): Promise<Board[]> =>
  (await apiClient.get<Board[] | null>(`/boards${includeArchived ? '?includeArchived=true' : ''}`)) ?? []

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

export const setBoardVisibility = (id: string, visibility: BoardVisibility): Promise<Board> =>
  apiClient.patch(`/boards/${id}/visibility`, { visibility })

export const fetchSharedBoard = (slug: string): Promise<SharedBoard> =>
  apiClient.get(`/boards/shared/${slug}`)

export const cloneSharedBoard = (slug: string): Promise<{ id: string }> =>
  apiClient.post(`/boards/shared/${slug}/clone`)
