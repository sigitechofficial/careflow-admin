import { getApiBaseUrl } from '@/lib/api-base'
import type { ApiEnvelope } from '@/lib/api-client'
import { ApiError, apiJson } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth.store'

export type EmployeeComplianceStatus =
  | 'REQUIRED'
  | 'SUBMITTED'
  | 'PENDING_REVIEW'
  | 'VALID'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'REJECTED'
  | 'MISSING'
  | 'NOT_REQUIRED'
  | 'NO_LONGER_REQUIRED'

export type EmployeeComplianceDocumentRow = {
  id: string
  employeeComplianceId: string
  fileName: string
  originalName: string
  fileUrl: string
  mimeType: string
  fileSize: number
  uploadedAt: string
}

export type EmployeeComplianceRow = {
  id: string
  employeeId: string
  complianceTypeId: string | null
  requirementId: string | null
  status: EmployeeComplianceStatus
  issueDate: string | null
  expiryDate: string | null
  notes: string | null
  isNoLongerRequired: boolean
  noLongerRequiredReason: string | null
  complianceType: { id: string; name: string; hasExpiry?: boolean; requiresDocument?: boolean } | null
  documents: EmployeeComplianceDocumentRow[]
}

export type RequiredComplianceTypeRow = {
  complianceTypeId: string
  requirementId: string | null
}

export type ComplianceChecklistItem = {
  complianceTypeId: string
  code: string | null
  name: string
  isMandatory: boolean
  requirementId: string | null
  record: EmployeeComplianceRow | null
}

export type ComplianceChecklistResponse = {
  workAreaId: string | null
  workAreaName: string | null
  items: ComplianceChecklistItem[]
}

export async function fetchComplianceChecklist(employeeId: string): Promise<ComplianceChecklistResponse> {
  const res = await apiJson<ApiEnvelope<ComplianceChecklistResponse>>(
    `/employees/${employeeId}/compliance/checklist`,
    { method: 'GET' },
  )
  return res.data
}

export async function ensureEmployeeComplianceChecklist(
  employeeId: string,
): Promise<ComplianceChecklistResponse & { createdCount: number }> {
  const res = await apiJson<
    ApiEnvelope<ComplianceChecklistResponse & { createdCount: number }> & { message?: string }
  >(`/employees/${employeeId}/compliance/ensure-checklist`, { method: 'POST' })
  return res.data
}

export async function listEmployeeCompliance(employeeId: string): Promise<EmployeeComplianceRow[]> {
  const res = await apiJson<ApiEnvelope<EmployeeComplianceRow[]>>(`/employees/${employeeId}/compliance`, {
    method: 'GET',
  })
  return res.data
}

export async function fetchRequiredComplianceTypes(employeeId: string): Promise<RequiredComplianceTypeRow[]> {
  const res = await apiJson<ApiEnvelope<RequiredComplianceTypeRow[]>>(
    `/employees/${employeeId}/compliance/required-types`,
    { method: 'GET' },
  )
  return res.data
}

export type CreateEmployeeCompliancePayload = {
  complianceTypeId: string
  requirementId?: string
  issueDate?: string
  expiryDate?: string
  notes?: string
}

export async function createEmployeeCompliance(
  employeeId: string,
  body: CreateEmployeeCompliancePayload,
): Promise<EmployeeComplianceRow> {
  const res = await apiJson<ApiEnvelope<EmployeeComplianceRow>>(`/employees/${employeeId}/compliance`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export type UpdateEmployeeCompliancePayload = {
  issueDate?: string | null
  expiryDate?: string | null
  notes?: string | null
  submittedAt?: string | null
  clearVerification?: boolean
}

export async function updateEmployeeCompliance(
  employeeId: string,
  complianceId: string,
  body: UpdateEmployeeCompliancePayload,
): Promise<EmployeeComplianceRow> {
  const res = await apiJson<ApiEnvelope<EmployeeComplianceRow>>(
    `/employees/${employeeId}/compliance/${complianceId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteEmployeeCompliance(employeeId: string, complianceId: string): Promise<void> {
  await apiJson(`/employees/${employeeId}/compliance/${complianceId}`, { method: 'DELETE' })
}

export async function markComplianceNoLongerRequired(
  employeeId: string,
  complianceId: string,
  reason: string,
): Promise<EmployeeComplianceRow> {
  const res = await apiJson<ApiEnvelope<EmployeeComplianceRow>>(
    `/employees/${employeeId}/compliance/${complianceId}/no-longer-required`,
    { method: 'PATCH', body: JSON.stringify({ reason }) },
  )
  return res.data
}

export async function uploadComplianceDocument(
  employeeId: string,
  complianceId: string,
  file: File,
): Promise<EmployeeComplianceDocumentRow> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${base}/employees/${employeeId}/compliance/${complianceId}/documents`, {
    method: 'POST',
    headers,
    body: form,
  })
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    const msg =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : res.statusText
    throw new ApiError(msg || 'Upload failed', res.status, body)
  }
  if (typeof body !== 'object' || body === null || !('data' in body)) {
    throw new ApiError('Unexpected API response', 0)
  }
  return (body as ApiEnvelope<EmployeeComplianceDocumentRow>).data
}

export async function deleteComplianceDocument(
  employeeId: string,
  complianceId: string,
  documentId: string,
): Promise<void> {
  await apiJson(`/employees/${employeeId}/compliance/${complianceId}/documents/${documentId}`, {
    method: 'DELETE',
  })
}

export async function downloadComplianceDocument(
  employeeId: string,
  complianceId: string,
  documentId: string,
  downloadName: string,
): Promise<void> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured.', 0)
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(
    `${base}/employees/${employeeId}/compliance/${complianceId}/documents/${documentId}/download`,
    { method: 'GET', headers },
  )
  if (!res.ok) {
    throw new ApiError(res.statusText || 'Download failed', res.status)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = downloadName
  a.click()
  URL.revokeObjectURL(url)
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export function complianceDatesToPayload(issueDate: string, expiryDate: string): UpdateEmployeeCompliancePayload {
  const body: UpdateEmployeeCompliancePayload = {}
  if (issueDate.trim()) body.issueDate = new Date(`${issueDate.trim()}T12:00:00.000Z`).toISOString()
  else body.issueDate = null
  if (expiryDate.trim()) body.expiryDate = new Date(`${expiryDate.trim()}T12:00:00.000Z`).toISOString()
  else body.expiryDate = null
  return body
}

export { isoToDateInput as complianceIsoToDateInput }
