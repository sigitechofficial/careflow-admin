import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { ListMeta, PathwayActionRow, PathwayActionType } from '../types/care-pathway.types'
import { listPathwayChecklists } from './pathway-checklists.api'

export async function listPathwayActions(params?: {
  page?: number
  limit?: number
  search?: string
}): Promise<{ rows: PathwayActionRow[]; meta: ListMeta }> {
  const q = new URLSearchParams()
  if (params?.page) q.set('page', String(params.page))
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.search) q.set('search', params.search)
  const res = await apiJson<ApiEnvelope<PathwayActionRow[]>>(
    `/pathway-actions${q.toString() ? `?${q}` : ''}`,
    { method: 'GET' },
  )
  return { rows: res.data ?? [], meta: (res.meta ?? {}) as ListMeta }
}

export async function listPathwayChecklistsBrief(): Promise<{ id: string; name: string }[]> {
  const { rows } = await listPathwayChecklists({ limit: 100 })
  return rows.map(r => ({ id: r.id, name: r.name }))
}

export async function createPathwayAction(body: {
  actionName: string
  actionIcon: string
  actionType: PathwayActionType
  instruction?: string
  carersCount?: number
  notesMandatory?: boolean
  photoAllowed?: boolean
  allowFamilyShare?: boolean
  checklistIds?: string[]
}): Promise<PathwayActionRow> {
  const res = await apiJson<ApiEnvelope<PathwayActionRow>>('/pathway-actions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deletePathwayAction(id: string): Promise<void> {
  await apiJson(`/pathway-actions/${id}`, { method: 'DELETE' })
}
