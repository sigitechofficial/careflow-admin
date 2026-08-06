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

export async function fetchServiceUserCompletedVisits(
  serviceUserId: string,
  params?: ServiceUserActivityVisitQuery,
) {
  const qs = new URLSearchParams({
    serviceUserId,
    statuses: 'COMPLETED,PARTIALLY_COMPLETED',
    sortBy: 'scheduledStartDateTime',
    sortOrder: 'desc',
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
