import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { CarePathwayFormType } from '../types/care-pathway.types'

export type FormSelectionGroup = {
  carePlans: FormSelectionEntry[]
  assessments: FormSelectionEntry[]
  serviceForms: FormSelectionEntry[]
  staffForms: FormSelectionEntry[]
}

export type FormSelectionEntry = {
  id: string
  formId: string
  formType: CarePathwayFormType
  form: { id: string; name: string; formType: CarePathwayFormType; status: string }
}

export type SelectableForm = {
  id: string
  name: string
  description: string | null
  formType: CarePathwayFormType
  status: string
  versionLabel: string
  pictureUrl?: string | null
  lastPublishedAt?: string | null
}

export async function fetchFormSelections(): Promise<FormSelectionGroup> {
  const res = await apiJson<ApiEnvelope<FormSelectionGroup>>('/form-selection', { method: 'GET' })
  return res.data
}

export async function updateFormSelections(body: {
  carePlans?: string[]
  assessments?: string[]
  serviceForms?: string[]
  staffForms?: string[]
}): Promise<FormSelectionGroup> {
  const res = await apiJson<ApiEnvelope<FormSelectionGroup>>('/form-selection', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

/** Assessment forms an organisation requires for one care plan form. */
export type CarePlanRequiredAssessments = {
  carePlanFormId: string
  assessmentFormIds: string[]
}

export async function fetchCarePlanRequiredAssessments(): Promise<CarePlanRequiredAssessments[]> {
  const res = await apiJson<ApiEnvelope<CarePlanRequiredAssessments[]>>(
    '/form-selection/care-plan-required-assessments',
    { method: 'GET' },
  )
  return res.data ?? []
}

export async function updateCarePlanRequiredAssessments(
  body: CarePlanRequiredAssessments,
): Promise<CarePlanRequiredAssessments> {
  const res = await apiJson<ApiEnvelope<CarePlanRequiredAssessments>>(
    `/form-selection/care-plan-required-assessments/${encodeURIComponent(body.carePlanFormId)}`,
    { method: 'PUT', body: JSON.stringify({ assessmentFormIds: body.assessmentFormIds }) },
  )
  return res.data
}

export async function listSelectableForms(
  type: 'care-plans' | 'assessments' | 'service-forms' | 'staff-forms',
  params?: { search?: string; limit?: number; page?: number },
): Promise<SelectableForm[]> {
  const q = new URLSearchParams()
  if (params?.search) q.set('search', params.search)
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.page) q.set('page', String(params.page))
  const qs = q.toString()
  const res = await apiJson<ApiEnvelope<SelectableForm[]>>(
    `/form-selection/${type}${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
  return res.data ?? []
}
