import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type ComplianceRequirementRow = {
  id: string
  complianceTypeId: string
  roleId: string | null
  workAreaId: string | null
  jobTitleId: string | null
  contractTypeId: string | null
  locationId: string | null
  zoneId: string | null
  isMandatory: boolean
  blocksAllocation?: boolean
  renewalBeforeDays: number
  notes: string | null
  isActive: boolean
  complianceType?: { id: string; name: string; code: string | null } | null
}

export type ComplianceRequirementsListResponse = {
  data: ComplianceRequirementRow[]
  meta?: { page: number; limit: number; total: number; totalPages: number }
}

export async function fetchComplianceRequirements(params?: {
  page?: number
  limit?: number
}): Promise<ComplianceRequirementsListResponse> {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(Math.min(params.limit, 100)))
  const q = qs.toString()
  return apiJson<ComplianceRequirementsListResponse>(
    `/compliance-requirements${q ? `?${q}` : ''}`,
    { method: 'GET' },
  )
}

export async function createComplianceRequirement(body: {
  complianceTypeId: string
  roleId?: string
  workAreaId?: string
  jobTitleId?: string
  contractTypeId?: string
  locationId?: string
  zoneId?: string
  isMandatory?: boolean
  blocksAllocation?: boolean
  renewalBeforeDays?: number
  notes?: string
}): Promise<ComplianceRequirementRow> {
  const res = await apiJson<ApiEnvelope<ComplianceRequirementRow>>('/compliance-requirements', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateComplianceRequirement(
  id: string,
  body: Partial<{
    complianceTypeId: string
    roleId: string | null
    workAreaId: string | null
    jobTitleId: string | null
    contractTypeId: string | null
    locationId: string | null
    zoneId: string | null
    isMandatory: boolean
    renewalBeforeDays: number
    notes: string | null
    isActive: boolean
    blocksAllocation: boolean
  }>,
): Promise<ComplianceRequirementRow> {
  const res = await apiJson<ApiEnvelope<ComplianceRequirementRow>>(`/compliance-requirements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteComplianceRequirement(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/compliance-requirements/${id}`, { method: 'DELETE' })
}
