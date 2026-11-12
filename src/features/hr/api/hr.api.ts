import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type CareWorkforceCategory =
  | 'NEW_TO_CARE'
  | 'CARE_OR_SUPPORT_WORKER'
  | 'SUPERVISOR_OR_LEADER'
  | 'PRACTITIONER'
  | 'DEPUTY_MANAGER'
  | 'REGISTERED_MANAGER'
  | 'NON_DIRECT_CARE'

export type EmployeeLifecycleStatus =
  | 'PRE_EMPLOYMENT'
  | 'CLEARED'
  | 'ONBOARDING'
  | 'ACTIVE'
  | 'ACTIVE_PAUSED'
  | 'LEAVING'
  | 'LEFT'
  | 'ALUMNI'

export type HrDeploymentStatus = 'GREEN' | 'AMBER' | 'RED'

export type HrDocumentType =
  | 'ID_DOCUMENT'
  | 'CONTRACT'
  | 'QUALIFICATION'
  | 'CERTIFICATE'
  | 'OTHER'

export type HrDocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type HrEmployeeListRow = {
  employeeId: string
  employeeNumber: string | null
  name: string
  jobTitle: string | null
  employmentType: string | null
  employeeLifecycleStatus: EmployeeLifecycleStatus
  /** What HR set on the HR profile. */
  deploymentStatus: HrDeploymentStatus
  /** The worse of the HR status and mandatory compliance. */
  readinessStatus: HrDeploymentStatus
  compliance: { level: HrDeploymentStatus; issues: string[] }
}

export type HrEmergencyContactRow = {
  id: string
  name: string
  relationship: string
  phone: string
}

export type HrProfile = {
  employeeId: string
  hrProfileId: string | null
  hasHrProfile: boolean
  personal: {
    legalName: string | null
    preferredName: string | null
    firstName: string | null
    lastName: string | null
    dateOfBirth: string | null
    profilePhoto: string | null
  }
  employment: {
    jobTitleId: string | null
    jobTitle: string | null
    employmentType: string | null
    contractTypeId: string | null
    contractType: string | null
    careWorkforceCategory: CareWorkforceCategory | null
    contractedHours: number | null
    branchTeam: string | null
    branchLocationId: string | null
    branchLocation: string | null
    reportingManagerId: string | null
    reportingManagerName: string | null
    employmentStartDate: string | null
  }
  emergencyContacts: HrEmergencyContactRow[]
  hrStatus: {
    employeeLifecycleStatus: EmployeeLifecycleStatus
    deploymentStatus: HrDeploymentStatus
    operationalStatus: string | null
    operationalStatusId: string | null
  }
}

export type HrDocumentRow = {
  id: string
  employeeId: string
  name: string
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedDate: string
  documentType: HrDocumentType | null
  expiryDate: string | null
  status: HrDocumentStatus | null
}

export type HrProfilePayload = {
  legalName?: string
  preferredName?: string
  dateOfBirth?: string
  profilePhoto?: string
  jobTitleId?: string
  contractTypeId?: string
  careWorkforceCategory?: CareWorkforceCategory
  branchTeam?: string
  branchLocationId?: string
  reportingManagerId?: string
  employmentStartDate?: string
  employeeLifecycleStatus?: EmployeeLifecycleStatus
  deploymentStatus?: HrDeploymentStatus
}

export type ListHrEmployeesParams = {
  page?: number
  limit?: number
  search?: string
  employeeLifecycleStatus?: EmployeeLifecycleStatus
  deploymentStatus?: HrDeploymentStatus
}

export type HrListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export async function fetchHrEmployees(params: ListHrEmployeesParams = {}) {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.search?.trim()) qs.set('search', params.search.trim())
  if (params.employeeLifecycleStatus) qs.set('employeeLifecycleStatus', params.employeeLifecycleStatus)
  if (params.deploymentStatus) qs.set('deploymentStatus', params.deploymentStatus)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<HrEmployeeListRow[]>>(`/hr/employees${suffix}`)
  const meta = (res.meta ?? {}) as Partial<HrListMeta>
  return {
    data: res.data,
    meta: {
      page: meta.page ?? 1,
      limit: meta.limit ?? 20,
      total: meta.total ?? res.data.length,
      totalPages: meta.totalPages ?? 1,
      hasNextPage: meta.hasNextPage ?? false,
      hasPrevPage: meta.hasPrevPage ?? false,
    },
  }
}

export type HrSummary = {
  total: number
  lifecycle: Record<EmployeeLifecycleStatus, number>
  /** By readiness: the worse of the HR status and mandatory compliance. */
  deployment: Record<HrDeploymentStatus, number>
  /** People whose compliance makes them worse than the status HR set. */
  complianceFlagged: number
}

/** Head counts for the HR dashboard (an employee with no HR profile counts as Active / Green). */
export async function fetchHrSummary() {
  const res = await apiJson<ApiEnvelope<HrSummary>>('/hr/employees/summary')
  return res.data
}

export async function fetchHrProfile(employeeId: string) {
  const res = await apiJson<ApiEnvelope<HrProfile>>(`/hr/employees/${employeeId}/hr-profile`)
  return res.data
}

export async function createHrProfile(employeeId: string, payload: HrProfilePayload) {
  const res = await apiJson<ApiEnvelope<HrProfile>>(`/hr/employees/${employeeId}/hr-profile`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function updateHrProfile(employeeId: string, payload: HrProfilePayload) {
  const res = await apiJson<ApiEnvelope<HrProfile>>(`/hr/employees/${employeeId}/hr-profile`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return res.data
}

export async function fetchHrDocuments(employeeId: string) {
  const res = await apiJson<ApiEnvelope<HrDocumentRow[]>>(`/hr/employees/${employeeId}/documents`)
  return res.data
}

export async function deleteHrDocument(documentId: string) {
  await apiJson(`/hr/documents/${documentId}`, { method: 'DELETE' })
}

export async function updateHrDocumentStatus(documentId: string, status: HrDocumentStatus) {
  const res = await apiJson<ApiEnvelope<HrDocumentRow>>(`/hr/documents/${documentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return res.data
}

/** HR documents that have expired or expire within 30 days, soonest first. */
export type ExpiringHrDocument = {
  id: string
  name: string
  documentType: HrDocumentType | null
  status: HrDocumentStatus | null
  expiryDate: string
  employeeId: string
  employeeName: string
}

export async function fetchExpiringHrDocuments() {
  const res = await apiJson<ApiEnvelope<ExpiringHrDocument[]>>('/hr/documents/expiring')
  return res.data
}
