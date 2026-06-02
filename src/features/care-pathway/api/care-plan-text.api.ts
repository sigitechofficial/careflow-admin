import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type CarePlanTextTemplate = {
  id: string
  title: string
  categoryId: string | null
  contentHtml: string
  isActive: boolean
  category?: { id: string; name: string } | null
}

export async function listCarePlanTextTemplates(params?: {
  search?: string
  categoryId?: string
}): Promise<CarePlanTextTemplate[]> {
  const q = new URLSearchParams()
  if (params?.search) q.set('search', params.search)
  if (params?.categoryId) q.set('categoryId', params.categoryId)
  q.set('limit', '100')
  const res = await apiJson<ApiEnvelope<CarePlanTextTemplate[]>>(
    `/care-plan-text?${q}`,
    { method: 'GET' },
  )
  return res.data ?? []
}

export async function listCarePlanTextCategories(): Promise<{ id: string; name: string }[]> {
  const res = await apiJson<ApiEnvelope<{ id: string; name: string }[]>>('/care-plan-text/categories', {
    method: 'GET',
  })
  return res.data ?? []
}

export async function createCarePlanTextTemplate(body: {
  title: string
  categoryId?: string
  contentHtml: string
}): Promise<CarePlanTextTemplate> {
  const res = await apiJson<ApiEnvelope<CarePlanTextTemplate>>('/care-plan-text', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateCarePlanTextTemplate(
  id: string,
  body: Partial<{ title: string; categoryId: string; contentHtml: string; isActive: boolean }>,
): Promise<CarePlanTextTemplate> {
  const res = await apiJson<ApiEnvelope<CarePlanTextTemplate>>(`/care-plan-text/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteCarePlanTextTemplate(id: string): Promise<void> {
  await apiJson(`/care-plan-text/${id}`, { method: 'DELETE' })
}

export async function previewCarePlanText(
  id: string,
  serviceUserName: string,
): Promise<{ contentHtml: string }> {
  const res = await apiJson<ApiEnvelope<{ contentHtml: string }>>(`/care-plan-text/${id}/preview`, {
    method: 'POST',
    body: JSON.stringify({ serviceUserName }),
  })
  return res.data
}
