import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  ApproveScope,
  ExceptionQueueRow,
  PayEvaluationFailure,
  VisitNightDutyFilter,
  VisitReconciliationDetail,
  VisitReconciliationRow,
  VisitReconciliationsSummary,
} from '@/features/billing/types/visit-reconciliation.types'
import type { VisitReconciliationStatus } from '@/features/billing/types/billing.types'

export type VisitReconciliationsListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

export async function fetchVisitReconciliations(params?: {
  search?: string
  status?: VisitReconciliationStatus
  hasExceptions?: boolean
  serviceUserId?: string
  employeeId?: string
  locationId?: string
  nightDuty?: VisitNightDutyFilter
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}): Promise<{ rows: VisitReconciliationRow[]; meta: VisitReconciliationsListMeta }> {
  const qs = new URLSearchParams()
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.status) qs.set('status', params.status)
  if (params?.hasExceptions != null) qs.set('hasExceptions', String(params.hasExceptions))
  if (params?.serviceUserId) qs.set('serviceUserId', params.serviceUserId)
  if (params?.employeeId) qs.set('employeeId', params.employeeId)
  if (params?.locationId) qs.set('locationId', params.locationId)
  if (params?.nightDuty) qs.set('nightDuty', params.nightDuty)
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params?.dateTo) qs.set('dateTo', params.dateTo)
  if (params?.page != null) qs.set('page', String(params.page))
  if (params?.limit != null) qs.set('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<VisitReconciliationRow[]>>(
    `/billing/visit-reconciliations${suffix}`,
    { method: 'GET' },
  )
  const meta = (res.meta ?? {}) as Partial<VisitReconciliationsListMeta>
  return {
    rows: res.data,
    meta: {
      page: meta.page ?? 1,
      limit: meta.limit ?? 50,
      total: meta.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      totalPages: meta.totalPages ?? 1,
      hasNextPage: meta.hasNextPage,
      hasPrevPage: meta.hasPrevPage,
    },
  }
}

export async function fetchVisitReconciliationsSummary(
  locationId?: string,
): Promise<VisitReconciliationsSummary> {
  const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ''
  const res = await apiJson<ApiEnvelope<VisitReconciliationsSummary>>(
    `/billing/visit-reconciliations/summary${qs}`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchVisitReconciliationExceptionQueue(
  limit = 10,
): Promise<ExceptionQueueRow[]> {
  const res = await apiJson<ApiEnvelope<ExceptionQueueRow[]>>(
    `/billing/visit-reconciliations/exception-queue?limit=${limit}`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchVisitReconciliation(id: string): Promise<VisitReconciliationDetail> {
  const res = await apiJson<ApiEnvelope<VisitReconciliationDetail>>(
    `/billing/visit-reconciliations/${id}`,
    { method: 'GET' },
  )
  return res.data
}

export async function updateVisitReconciliation(
  id: string,
  body: {
    approvedPayStart?: string | null
    approvedPayEnd?: string | null
    approvedBillStart?: string | null
    approvedBillEnd?: string | null
    approvalNotes?: string | null
    travelMiles?: number | null
    travelMinutes?: number | null
  },
): Promise<VisitReconciliationDetail> {
  const res = await apiJson<ApiEnvelope<VisitReconciliationDetail>>(
    `/billing/visit-reconciliations/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function setVisitPayableAmount(
  id: string,
  body: {
    payableAmount: number
    notes?: string
    approveForPay?: boolean
  },
): Promise<VisitReconciliationDetail> {
  const res = await apiJson<ApiEnvelope<VisitReconciliationDetail>>(
    `/billing/visit-reconciliations/${id}/payable-amount`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function setVisitBillableAmount(
  id: string,
  body: {
    billableAmount: number
    notes?: string
    approveForInvoice?: boolean
  },
): Promise<VisitReconciliationDetail> {
  const res = await apiJson<ApiEnvelope<VisitReconciliationDetail>>(
    `/billing/visit-reconciliations/${id}/billable-amount`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function approveVisitReconciliation(
  id: string,
  body: {
    scope: ApproveScope
    managerOverride?: boolean
    approvalNotes?: string
    exclusive?: boolean
  },
): Promise<void> {
  await apiJson(`/billing/visit-reconciliations/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function rejectVisitReconciliation(
  id: string,
  body: { scope: ApproveScope; approvalNotes?: string },
): Promise<void> {
  await apiJson(`/billing/visit-reconciliations/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function approveVisitOverrun(
  id: string,
  body?: {
    notes?: string
    /** Price on the planned slot or the actual clock times. */
    timeBasis?: 'PLANNED' | 'ACTUAL'
    /** Which side(s) the time basis applies to; the other side stays planned. */
    applyTo?: 'PAY' | 'CHARGE' | 'BOTH'
  },
): Promise<VisitReconciliationDetail> {
  const res = await apiJson<ApiEnvelope<VisitReconciliationDetail>>(
    `/billing/visit-reconciliations/${id}/overrun/approve`,
    {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    },
  )
  return res.data
}

export async function rejectVisitOverrun(
  id: string,
  body?: { notes?: string },
): Promise<VisitReconciliationDetail> {
  const res = await apiJson<ApiEnvelope<VisitReconciliationDetail>>(
    `/billing/visit-reconciliations/${id}/overrun/reject`,
    {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    },
  )
  return res.data
}

export async function bulkApproveVisitReconciliations(body: {
  ids: string[]
  scope: ApproveScope
  approvalNotes?: string
}): Promise<{ approved: string[]; skipped: Array<{ id: string; reason: string }> }> {
  const res = await apiJson<
    ApiEnvelope<{ approved: string[]; skipped: Array<{ id: string; reason: string }> }>
  >('/billing/visit-reconciliations/bulk-approve', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function backfillVisitReconciliations(body?: {
  dateFrom?: string
  dateTo?: string
}): Promise<{ count: number; ids: string[]; reEvaluated?: number }> {
  const res = await apiJson<
    ApiEnvelope<{ count: number; ids: string[]; reEvaluated?: number }>
  >('/billing/visit-reconciliations/backfill', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })
  return res.data
}

export type VisitReconciliationRecalculateSummary = {
  reEvaluated: number
  /** Visits whose pay or charge amount changed. */
  changed: number
  unchanged: number
  failed: number
  /** Selected rows skipped because they are locked. */
  skippedLocked: number
  /** Only the first 1000 rows are processed per run. */
  limitReached: boolean
  totals: {
    payableBefore: number
    payableAfter: number
    billableBefore: number
    billableAfter: number
  }
  /** Each recalculated visit with its amounts before and after. */
  visits: Array<{
    id: string
    visitRef: string
    plannedStartDateTime: string
    serviceUserName: string | null
    employeeName: string | null
    payableBefore: number | null
    payableAfter: number | null
    billableBefore: number | null
    billableAfter: number | null
    changed: boolean
    failed: boolean
  }>
  ids: string[]
}

export async function recalculateVisitReconciliationAmounts(body: {
  ids?: string[]
  dateFrom?: string
  dateTo?: string
  reason: string
}): Promise<VisitReconciliationRecalculateSummary> {
  const res = await apiJson<ApiEnvelope<VisitReconciliationRecalculateSummary>>(
    '/billing/visit-reconciliations/recalculate-amounts',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function clearAllVisitReconciliations(params?: {
  serviceUserId?: string
}): Promise<{
  before: number
  visitReconciliations: number
  payrollRunLines: number
  invoiceRunLines: number
  financeExceptions: number
}> {
  const res = await apiJson<
    ApiEnvelope<{
      before: number
      visitReconciliations: number
      payrollRunLines: number
      invoiceRunLines: number
      financeExceptions: number
    }>
  >('/billing/visit-reconciliations/clear-all', {
    method: 'POST',
    body: JSON.stringify({
      ...(params?.serviceUserId ? { serviceUserId: params.serviceUserId } : {}),
    }),
  })
  return res.data
}

export async function fetchPayEvaluationFailures(locationId?: string): Promise<PayEvaluationFailure[]> {
  const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ''
  const res = await apiJson<ApiEnvelope<PayEvaluationFailure[]>>(
    `/billing/visit-reconciliations/evaluation-failures${qs}`,
    { method: 'GET' },
  )
  return res.data
}

export async function retryPayEvaluationFailure(
  id: string,
): Promise<{ message: string; data: PayEvaluationFailure }> {
  return apiJson<{ message: string; data: PayEvaluationFailure }>(
    `/billing/visit-reconciliations/evaluation-failures/${id}/retry`,
    { method: 'POST' },
  )
}

export async function dismissPayEvaluationFailure(
  id: string,
  reason: string,
): Promise<{ message: string; data: PayEvaluationFailure }> {
  return apiJson<{ message: string; data: PayEvaluationFailure }>(
    `/billing/visit-reconciliations/evaluation-failures/${id}/dismiss`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  )
}
