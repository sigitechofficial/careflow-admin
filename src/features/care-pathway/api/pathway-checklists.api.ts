import { apiJson, type ApiEnvelope } from '@/lib/api-client'
import type { ListMeta, PathwayChecklistRow } from '../types/care-pathway.types'

export async function listPathwayChecklists(params?: {
  page?: number
  limit?: number
  search?: string
}): Promise<{ rows: PathwayChecklistRow[]; meta: ListMeta }> {
  const q = new URLSearchParams()
  if (params?.page) q.set('page', String(params.page))
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.search) q.set('search', params.search)
  const res = await apiJson<ApiEnvelope<PathwayChecklistRow[]>>(
    `/pathway-checklists${q.toString() ? `?${q}` : ''}`,
    { method: 'GET' },
  )
  return { rows: res.data ?? [], meta: (res.meta ?? {}) as ListMeta }
}

export async function createPathwayChecklist(body: {
  name: string
  icon?: string
  observationEnabled?: boolean
  recordPhoto?: boolean
  familyShare?: boolean
  groupAction?: boolean
  items?: { itemText: string; sortOrder?: number }[]
}): Promise<PathwayChecklistRow> {
  const res = await apiJson<ApiEnvelope<PathwayChecklistRow>>('/pathway-checklists', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updatePathwayChecklist(
  id: string,
  body: Partial<{
    name: string
    icon: string
    observationEnabled: boolean
    recordPhoto: boolean
    familyShare: boolean
    groupAction: boolean
  }>,
): Promise<PathwayChecklistRow> {
  const res = await apiJson<ApiEnvelope<PathwayChecklistRow>>(`/pathway-checklists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deletePathwayChecklist(id: string): Promise<void> {
  await apiJson(`/pathway-checklists/${id}`, { method: 'DELETE' })
}
