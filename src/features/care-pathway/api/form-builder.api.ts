import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CareFormDetail,
  CareFormListRow,
  CarePathwayFormType,
  FormFieldType,
  ListMeta,
} from '../types/care-pathway.types'

export async function listCareForms(params?: {
  page?: number
  limit?: number
  search?: string
  formType?: CarePathwayFormType
}): Promise<{ rows: CareFormListRow[]; meta: ListMeta }> {
  const q = new URLSearchParams()
  if (params?.page) q.set('page', String(params.page))
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.search) q.set('search', params.search)
  if (params?.formType) q.set('formType', params.formType)
  const res = await apiJson<ApiEnvelope<CareFormListRow[]>>(
    `/form-builder${q.toString() ? `?${q}` : ''}`,
    { method: 'GET' },
  )
  return { rows: res.data ?? [], meta: (res.meta ?? {}) as ListMeta }
}

export async function getCareForm(id: string): Promise<CareFormDetail> {
  const res = await apiJson<ApiEnvelope<CareFormDetail>>(`/form-builder/${id}`, { method: 'GET' })
  return res.data
}

export async function createCareForm(body: {
  name: string
  formType: CarePathwayFormType
  description?: string
  pictureUrl?: string
}): Promise<CareFormDetail> {
  const res = await apiJson<ApiEnvelope<CareFormDetail>>('/form-builder', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateCareForm(
  id: string,
  body: Partial<{
    name: string
    formType: CarePathwayFormType
    description: string | null
    pictureUrl: string | null
  }>,
): Promise<CareFormDetail> {
  const res = await apiJson<ApiEnvelope<CareFormDetail>>(`/form-builder/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function saveCareFormSchema(
  id: string,
  sections: {
    title: string
    description?: string
    sortOrder: number
    fields: {
      label: string
      fieldType: FormFieldType
      placeholder?: string
      helpText?: string
      required?: boolean
      sortOrder: number
      optionsJson?: { options: string[] } | null
      conditionalLogicJson?: Record<string, unknown> | null
    }[]
  }[],
): Promise<CareFormDetail> {
  const res = await apiJson<ApiEnvelope<CareFormDetail>>(`/form-builder/${id}/schema`, {
    method: 'PATCH',
    body: JSON.stringify({ sections }),
  })
  return res.data
}

export async function publishCareForm(id: string): Promise<CareFormDetail> {
  const res = await apiJson<ApiEnvelope<CareFormDetail>>(`/form-builder/${id}/publish`, {
    method: 'POST',
  })
  return res.data
}

export async function deleteCareForm(id: string): Promise<void> {
  await apiJson(`/form-builder/${id}`, { method: 'DELETE' })
}

export async function uploadCareFormIcon(id: string, file: File): Promise<CareFormDetail> {
  const form = new FormData()
  form.append('file', file)
  const res = await apiJson<ApiEnvelope<CareFormDetail>>(`/form-builder/${id}/icon`, {
    method: 'POST',
    body: form,
  })
  return res.data
}
