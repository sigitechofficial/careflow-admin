import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

/** API: GET /dashboard/medication-exceptions — missed, refused, not given and held doses. */
export type MedicationExceptionStatus = 'MISSED' | 'REFUSED' | 'NOT_GIVEN' | 'HELD'
export type MedicationExceptions = {
  dateFrom: string
  dateTo: string
  total: number
  awaitingReview: number
  byStatus: Record<MedicationExceptionStatus, number>
  items: Array<{
    id: string
    status: MedicationExceptionStatus
    serviceUserId: string
    serviceUserName: string
    medicationName: string
    dueAt: string | null
    reason: string | null
    reviewed: boolean
  }>
}

/** API: GET /dashboard/service-user-upcoming — expiries and reviews due for service users. */
export type UpcomingCategory = {
  count: number
  overdue: number
  items: Array<{ id: string; serviceUserId: string; serviceUserName: string; label: string; dueDate: string; overdue: boolean }>
}
export type ServiceUserUpcoming = {
  days: number
  from: string
  to: string
  dols: UpcomingCategory
  legalAuthorities: UpcomingCategory
  documents: UpcomingCategory
  fundingEnding: UpcomingCategory
  purchaseOrders: UpcomingCategory
  fundingReviews: UpcomingCategory
  visitPlanReviews: UpcomingCategory
}

/** API: GET /dashboard/staff-off — staff absent or on holiday on a day. */
export type StaffOff = {
  date: string
  total: number
  sickness: number
  holiday: number
  unauthorised: number
  items: Array<{
    employeeId: string
    name: string
    reason: string
    sickness: boolean
    holiday: boolean
    unauthorised: boolean
    from: string
    to: string
  }>
}

/** API: GET /dashboard/policy-reviews — published policies due for review. */
export type PolicyReviews = {
  days: number
  count: number
  overdue: number
  items: Array<{ id: string; reference: string; title: string; reviewDate: string; overdue: boolean }>
}

/** API: GET /employee-compliance/summary — staff compliance document counts. */
export type ComplianceSummary = {
  totalRequired: number
  valid: number
  missing: number
  expired: number
  expiringSoon: number
  pendingReview: number
  rejected: number
  noLongerRequired: number
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export async function fetchMedicationExceptions(
  params: { dateFrom?: string; dateTo?: string; locationId?: string | null },
  signal?: AbortSignal,
): Promise<MedicationExceptions> {
  const res = await apiJson<ApiEnvelope<MedicationExceptions>>(`/dashboard/medication-exceptions${qs(params)}`, {
    method: 'GET',
    signal,
  })
  return res.data
}

export async function fetchServiceUserUpcoming(
  params: { days?: number; locationId?: string | null },
  signal?: AbortSignal,
): Promise<ServiceUserUpcoming> {
  const res = await apiJson<ApiEnvelope<ServiceUserUpcoming>>(`/dashboard/service-user-upcoming${qs(params)}`, {
    method: 'GET',
    signal,
  })
  return res.data
}

export async function fetchStaffOff(
  params: { date?: string; locationId?: string | null },
  signal?: AbortSignal,
): Promise<StaffOff> {
  const res = await apiJson<ApiEnvelope<StaffOff>>(`/dashboard/staff-off${qs(params)}`, { method: 'GET', signal })
  return res.data
}

export async function fetchPolicyReviews(params: { days?: number }, signal?: AbortSignal): Promise<PolicyReviews> {
  const res = await apiJson<ApiEnvelope<PolicyReviews>>(`/dashboard/policy-reviews${qs(params)}`, {
    method: 'GET',
    signal,
  })
  return res.data
}

export async function fetchComplianceSummary(
  params: { locationId?: string | null },
  signal?: AbortSignal,
): Promise<ComplianceSummary> {
  const res = await apiJson<ApiEnvelope<ComplianceSummary>>(`/employee-compliance/summary${qs(params)}`, {
    method: 'GET',
    signal,
  })
  return res.data
}

/** Count of doses given more than the late threshold after they were due (GET /medication-reports/late-administrations). */
export async function fetchLateMedicationCount(
  params: { dateFrom: string; dateTo: string },
  signal?: AbortSignal,
): Promise<number> {
  const res = await apiJson<ApiEnvelope<unknown[]>>(
    `/medication-reports/late-administrations${qs({ ...params, allServiceUsers: 'true', limit: 1 })}`,
    { method: 'GET', signal },
  )
  const meta = res.meta as { total?: number } | undefined
  return meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0)
}
