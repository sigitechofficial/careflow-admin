import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { addDaysToOperationalIso, combineOperationalDateAndHm } from '@/shared/lib/operational-day.util'

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
  /** Policy documents by status (DRAFT, IN_REVIEW, APPROVED, PUBLISHED, …). */
  byStatus?: Record<string, number>
  /** Published policies whose current version has no review date set. */
  publishedNoReviewDate?: number
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

/**
 * Count of doses given more than the late threshold after they were due (GET /medication-reports/late-administrations).
 * The report filters on date-times, so whole organisation days are sent (a bare date would be a zero-length range).
 */
export async function fetchLateMedicationCount(
  params: { dateFrom: string; dateTo: string },
  signal?: AbortSignal,
): Promise<number> {
  const from = combineOperationalDateAndHm(params.dateFrom, '00:00')
  const nextDay = combineOperationalDateAndHm(addDaysToOperationalIso(params.dateTo, 1), '00:00')
  const to = new Date(Date.parse(nextDay) - 1).toISOString()
  const res = await apiJson<ApiEnvelope<unknown[]>>(
    `/medication-reports/late-administrations${qs({ dateFrom: from, dateTo: to, allServiceUsers: 'true', limit: 1 })}`,
    { method: 'GET', signal },
  )
  const meta = res.meta as { total?: number } | undefined
  return meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0)
}

/** API: GET /dashboard/operations-overview — Care Operations dashboard counts (database-wide, branch-scoped). */
export type OperationsOverview = {
  today: string
  timeZone: string
  alerts: {
    open: number
    unacknowledged: number
    pastResponseTarget: number
    oldestOpenAt: string | null
    byKind: Record<string, number>
  }
  cover: {
    visitsToday: number
    unfilledToday: number
    visitsNext7: number
    unfilledNext7: number
    unfilledNext28: number
    nextUnfilledAt: string | null
    plannedHoursNext7: number
    needsAttention: number
  }
  cancellations: {
    last7: number
    providerCaused: number
    withoutWelfareCheck: number
    timeCriticalNotEscalated: number
    byReason: Record<string, number>
  }
  continuity: {
    windowDays: number
    serviceUsers: number
    averageCarers: number | null
    manyCarersThreshold: number
    serviceUsersWithManyCarers: number
  }
}

export async function fetchOperationsOverview(
  params: { locationId?: string | null },
  signal?: AbortSignal,
): Promise<OperationsOverview> {
  const res = await apiJson<ApiEnvelope<OperationsOverview>>(`/dashboard/operations-overview${qs(params)}`, {
    method: 'GET',
    signal,
  })
  return res.data
}

/** API: GET /dashboard/finance-overview — income invoiced, cash received, disputes (organisation-wide). */
export type FinanceOverview = {
  month: string
  currency: string
  invoicedThisMonth: { amount: number; runs: number }
  invoicedLastMonth: { amount: number; runs: number }
  receivedThisMonth: { amount: number; payments: number }
  disputed: { amount: number; runs: number }
  invoiceRunsAwaitingReview: number
}

export async function fetchFinanceOverview(signal?: AbortSignal): Promise<FinanceOverview> {
  const res = await apiJson<ApiEnvelope<FinanceOverview>>('/dashboard/finance-overview', { method: 'GET', signal })
  return res.data
}

/** API: GET /dashboard/admin-overview — platform usage and security signals (organisation-wide). */
export type AdminOverview = {
  users: number
  activeUsers7d: number
  dormantDays: number
  dormantUsers: number
  failedSignIns24h: number
  failedSignIns7d: number
  securityEvents7d: Record<string, number>
}

export async function fetchAdminOverview(signal?: AbortSignal): Promise<AdminOverview> {
  const res = await apiJson<ApiEnvelope<AdminOverview>>('/dashboard/admin-overview', { method: 'GET', signal })
  return res.data
}
