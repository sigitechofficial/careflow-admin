import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type CarerReportParams = {
  page: number
  limit: number
  search?: string
  locationId?: string
  status?: 'active' | 'inactive' | 'all'
  dateFrom?: string
  dateTo?: string
  withinDays?: number
}

export type CarerReportMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type CarerReportResponse = { data: Record<string, unknown>; meta: CarerReportMeta }

/** GET /employee-reports/{slug} — carer reports (activity, compliance, roles, …). */
export async function fetchCarerReport(slug: string, params: CarerReportParams, init?: RequestInit) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) qs.set(k, String(v))
  }
  const res = await apiJson<ApiEnvelope<Record<string, unknown>>>(
    `/employee-reports/${encodeURIComponent(slug)}?${qs.toString()}`,
    { method: 'GET', ...init },
  )
  return { data: (res.data ?? {}) as Record<string, unknown>, meta: res.meta as unknown as CarerReportMeta }
}
