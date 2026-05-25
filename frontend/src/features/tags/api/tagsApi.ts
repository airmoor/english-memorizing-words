import { apiClient } from '../../../shared/api/base'
import type { Tag } from '../../../entities/tag/model/types'

export interface CreateTagDto {
  name: string
}

export interface AssignTagByNameResponse {
  tag: Tag
  assigned: boolean
}

// GET /tags returns Tag[] directly — NOT { tags: Tag[] }
export const fetchTags = (): Promise<Tag[]> =>
  apiClient.get('/tags')

export const createTag = (dto: CreateTagDto): Promise<Tag> =>
  apiClient.post('/tags', dto)

export const updateTag = (id: string, dto: { name: string }): Promise<Tag> =>
  apiClient.patch(`/tags/${id}`, dto)

export const deleteTag = (id: string): Promise<void> =>
  apiClient.delete(`/tags/${id}`)

/** Assign an existing tag to a card */
export const assignTagToCard = (
  cardId: string,
  tagId: string,
): Promise<{ assigned: boolean; assignedAt: string }> =>
  apiClient.post(`/cards/${cardId}/tags/${tagId}`)

/** Remove a tag from a card */
export const removeTagFromCard = (
  cardId: string,
  tagId: string,
): Promise<{ removed: boolean }> =>
  apiClient.delete(`/cards/${cardId}/tags/${tagId}`)

/** Find-or-create tag by name AND assign it to the card in one call */
export const assignTagByName = (
  cardId: string,
  name: string,
): Promise<AssignTagByNameResponse> =>
  apiClient.post(`/cards/${cardId}/tags`, { name })
