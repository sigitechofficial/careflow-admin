import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type ServiceUserActivityVisit = {
  id: string
  scheduledJobId: string
  serviceUserId: string
  visitName: string
  scheduledStartDateTime: string
  scheduledEndDateTime: string | null
  actualStartDateTime: string | null
  actualEndDateTime: string | null
  status: string
  requiredCarers: number
  notes: string | null
  medicationRequired: boolean
  checklistRequired?: boolean
  photoRequired?: boolean
  notesRequired?: boolean
  scheduledJob?: {
    id: string
    jobName: string | null
    scheduleBatchId: string | null
    status: string
  } | null
  serviceUser?: {
    id: string
    firstName: string
    lastName: string
    preferredName?: string | null
  } | null
  /** Cancelled / called-off visits only: who, when and why. */
  cancellation?: {
    /** CANCELLATION: recorded on the rota or with "Cancel visits"; PLAN_CHANGE: cancelled by a visit plan change. */
    source: 'CANCELLATION' | 'PLAN_CHANGE'
    cancelledByName: string | null
    cancelledAt: string | null
    cancelledByParty: string | null
    cancelledByDescription: string | null
    reasonCode: string | null
    reasonLabel: string | null
    reasonNotes: string | null
    chargeDecision: string | null
    chargeDecisionNotes?: string | null
    /** Charge decision: percent of the visit fee billed. */
    chargePercent?: number | null
    noticeHours?: number | null
    /** Invoice the charge is on: locked (final) or on a run still being prepared. */
    invoice?: { invoiceNumber: string | null; locked: boolean } | null
  }
}

/** Change the billing decision of a cancelled visit (finance). Refused once on a locked invoice. */
export async function changeCancellationBilling(
  scheduledJobId: string,
  payload: { chargeDecision: 'CHARGE' | 'NO_CHARGE' | 'WAIVE' | 'PENDING_REVIEW'; note: string },
) {
  return apiJson<ApiEnvelope<unknown>>(`/scheduled-jobs-housekeeping/jobs/${scheduledJobId}/cancellation/billing`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export type ServiceUserActivityVisitListMeta = {
  page: number
  limit: number
  total: number
  totalPages?: number
}

export type ServiceUserActivityVisitQuery = {
  page?: number
  limit?: number
  /** Visit statuses to list (comma-joined for the API). Defaults to completed visits. */
  statuses?: string[]
  /** Newest first by default. */
  sortOrder?: 'asc' | 'desc'
  /** YYYY-MM-DD inclusive start */
  dateFrom?: string
  /** YYYY-MM-DD inclusive end */
  dateTo?: string
}

/** API expects ISO datetimes; date-only values become start/end of UTC day. */
function toApiDateBound(isoDate: string, endOfDay: boolean): string {
  const day = isoDate.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return isoDate
  return endOfDay ? `${day}T23:59:59.999Z` : `${day}T00:00:00.000Z`
}

/** Rota visits of one service user by status (completed by default). */
export async function fetchServiceUserCompletedVisits(
  serviceUserId: string,
  params?: ServiceUserActivityVisitQuery,
) {
  const qs = new URLSearchParams({
    serviceUserId,
    statuses: (params?.statuses?.length ? params.statuses : ['COMPLETED', 'PARTIALLY_COMPLETED']).join(','),
    sortBy: 'scheduledStartDateTime',
    sortOrder: params?.sortOrder ?? 'desc',
    page: String(params?.page ?? 1),
    limit: String(params?.limit ?? 50),
  })
  if (params?.dateFrom?.trim()) qs.set('dateFrom', toApiDateBound(params.dateFrom, false))
  if (params?.dateTo?.trim()) qs.set('dateTo', toApiDateBound(params.dateTo, true))

  const res = await apiJson<ApiEnvelope<ServiceUserActivityVisit[]>>(
    `/scheduled-visits?${qs.toString()}`,
    { method: 'GET' },
  )
  return {
    data: res.data ?? [],
    meta: (res.meta as ServiceUserActivityVisitListMeta | undefined) ?? {
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
      total: (res.data ?? []).length,
    },
  }
}
