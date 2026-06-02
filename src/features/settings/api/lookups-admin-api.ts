import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { LookupRow } from '@/features/employees/api'

export type LookupResource =
  | 'job-titles'
  | 'skill-types'
  | 'work-areas'
  | 'grades'
  | 'contract-types'
  | 'certification-types'
  | 'non-core-activity-reasons'
  | 'leaving-reasons'
  | 'review-types'
  | 'locations'
  | 'zones'
  | 'travel-payment-types'

const GET_PATH: Record<LookupResource, string> = {
  'job-titles': '/lookups/job-titles',
  'skill-types': '/lookups/skill-types',
  'work-areas': '/lookups/work-areas',
  grades: '/lookups/grades',
  'contract-types': '/lookups/contract-types',
  'certification-types': '/lookups/certification-types',
  'non-core-activity-reasons': '/lookups/non-core-activity-reasons',
  'leaving-reasons': '/lookups/leaving-reasons',
  'review-types': '/lookups/review-types',
  locations: '/lookups/locations',
  zones: '/lookups/zones',
  'travel-payment-types': '/lookups/travel-payment-types',
}

export async function fetchLookupList(resource: LookupResource): Promise<LookupRow[]> {
  const res = await apiJson<ApiEnvelope<LookupRow[]>>(GET_PATH[resource], { method: 'GET' })
  return res.data
}

export async function createLookupItem(resource: LookupResource, name: string): Promise<LookupRow> {
  const res = await apiJson<ApiEnvelope<LookupRow>>(`/lookups/${resource}`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return res.data
}

export async function updateLookupItem(
  resource: LookupResource,
  id: string,
  name: string,
): Promise<LookupRow> {
  const res = await apiJson<ApiEnvelope<LookupRow>>(`/lookups/${resource}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
  return res.data
}

export async function deleteLookupItem(resource: LookupResource, id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/lookups/${resource}/${id}`, { method: 'DELETE' })
}

export type ComplianceTypeRow = {
  id: string
  name: string
  code: string | null
  category: string
  isMandatoryByDefault: boolean
  hasExpiry: boolean
}

export type ComplianceCategory =
  | 'IDENTITY'
  | 'RIGHT_TO_WORK'
  | 'SAFEGUARDING'
  | 'TRAINING'
  | 'CLINICAL'
  | 'EMPLOYMENT'
  | 'HEALTH_AND_SAFETY'
  | 'PROFESSIONAL_REGISTRATION'
  | 'DRIVING'
  | 'OTHER'

export { COMPLIANCE_CATEGORIES } from '@/features/settings/constants/compliance-categories'

export async function fetchComplianceTypesList(params?: {
  search?: string
  limit?: number
}): Promise<ComplianceTypeRow[]> {
  const qs = new URLSearchParams()
  qs.set('limit', String(params?.limit ?? 500))
  qs.set('sortBy', 'name')
  qs.set('sortOrder', 'asc')
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  const res = await apiJson<ApiEnvelope<ComplianceTypeRow[]> & { meta?: unknown }>(
    `/compliance-types?${qs}`,
    { method: 'GET' },
  )
  return res.data
}

export async function createComplianceType(body: {
  name: string
  code: string
  category: ComplianceCategory
  isMandatoryByDefault?: boolean
}): Promise<ComplianceTypeRow> {
  const res = await apiJson<ApiEnvelope<ComplianceTypeRow>>('/compliance-types', {
    method: 'POST',
    body: JSON.stringify({
      hasExpiry: true,
      requiresDocument: true,
      requiresVerification: true,
      isMandatoryByDefault: body.isMandatoryByDefault ?? false,
      ...body,
    }),
  })
  return res.data
}

export async function updateComplianceType(
  id: string,
  body: {
    name?: string
    code?: string
    category?: ComplianceCategory
    isMandatoryByDefault?: boolean
  },
): Promise<ComplianceTypeRow> {
  const res = await apiJson<ApiEnvelope<ComplianceTypeRow>>(`/compliance-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteComplianceType(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/compliance-types/${id}`, { method: 'DELETE' })
}
