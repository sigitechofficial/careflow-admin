import { apiJson, type ApiEnvelope } from '@/lib/api-client'
import type {
  CallOffVisitRow,
  DateRangeQuery,
  HousekeepingJob,
  JobsDayRunsResponse,
  PaginationMeta,
  ReportTypeRow,
  ScheduleAreaRow,
  ScheduleStatusResponse,
  TimelineJob,
} from '../types/scheduling.types'

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function getScheduleReportTypes() {
  const res = await apiJson<ApiEnvelope<ReportTypeRow[]>>('/schedule-reports/report-types', { method: 'GET' })
  return res.data ?? []
}

export async function getJobsDayRuns(date: string, params: { scheduleBatchId?: string; limit?: number } = {}) {
  const res = await apiJson<ApiEnvelope<JobsDayRunsResponse>>(
    `/schedule-timelines/jobs/day-runs${buildQuery({ date, limit: params.limit ?? 200, ...params })}`,
    { method: 'GET' },
  )
  return res.data!
}

export async function getJobsDayTimeline(date: string, params: { scheduleBatchId?: string; limit?: number } = {}) {
  const res = await apiJson<ApiEnvelope<{ date: string; jobs: TimelineJob[] }>>(
    `/schedule-timelines/jobs/day-timeline${buildQuery({ date, limit: params.limit ?? 200, ...params })}`,
    { method: 'GET' },
  )
  return { jobs: res.data?.jobs ?? [], meta: res.meta as PaginationMeta | undefined }
}

export async function getHousekeepingJobsNotStarted(params: Record<string, string | number | undefined>) {
  const res = await apiJson<ApiEnvelope<HousekeepingJob[]>>(
    `/scheduled-jobs-housekeeping/jobs-not-started${buildQuery(params)}`,
    { method: 'GET' },
  )
  return { rows: res.data ?? [], meta: res.meta as PaginationMeta | undefined }
}

export async function getHousekeepingJobsNeedingAttention(params: Record<string, string | number | undefined>) {
  const res = await apiJson<ApiEnvelope<HousekeepingJob[]>>(
    `/scheduled-jobs-housekeeping/jobs-needing-attention${buildQuery(params)}`,
    { method: 'GET' },
  )
  return { rows: res.data ?? [], meta: res.meta as PaginationMeta | undefined }
}

export async function getHousekeepingDayJobs(date: string, params: Record<string, string | number | undefined> = {}) {
  const res = await apiJson<ApiEnvelope<{ date: string; jobs: HousekeepingJob[] }>>(
    `/scheduled-jobs-housekeeping/day-jobs${buildQuery({ date, ...params })}`,
    { method: 'GET' },
  )
  return { date: res.data?.date ?? date, jobs: res.data?.jobs ?? [], meta: res.meta as PaginationMeta | undefined }
}

export async function completeHousekeepingJob(id: string, notes?: string) {
  const res = await apiJson<ApiEnvelope<unknown>>(`/scheduled-jobs-housekeeping/jobs/${id}/complete`, {
    method: 'PATCH',
    body: JSON.stringify(notes ? { notes } : {}),
  })
  return res
}

export async function cancelHousekeepingJob(id: string, notes?: string) {
  const res = await apiJson<ApiEnvelope<unknown>>(`/scheduled-jobs-housekeeping/jobs/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify(notes ? { notes } : {}),
  })
  return res
}

export async function getScheduleReport(
  endpoint: string,
  query: DateRangeQuery,
): Promise<{ data: unknown; meta?: PaginationMeta; export?: unknown }> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const res = await apiJson<ApiEnvelope<unknown>>(
    `${path}${buildQuery(query as Record<string, string | number | boolean | undefined>)}`,
    { method: 'GET' },
  )
  return { data: res.data, meta: res.meta as PaginationMeta | undefined, export: (res as { export?: unknown }).export }
}

export async function getScheduleStatus(date: string) {
  const res = await apiJson<ApiEnvelope<ScheduleStatusResponse>>(
    `/schedules/status${buildQuery({ date })}`,
    { method: 'GET' },
  )
  const payload = res.data as ScheduleStatusResponse | { data: ScheduleStatusResponse }
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data as ScheduleStatusResponse
  }
  return payload as ScheduleStatusResponse
}

export async function buildSchedule(payload: {
  scheduleDate: string
  buildSource: 'MANUAL' | 'TEMPLATE' | 'WITHOUT_TEMPLATE'
  areaIds?: string[]
  notes?: string
}) {
  const res = await apiJson<ApiEnvelope<unknown>>('/schedules/build', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res
}

export async function listScheduleAreas() {
  const res = await apiJson<ApiEnvelope<ScheduleAreaRow[]>>(
    '/schedule-areas?limit=100&isActive=true&sortBy=sortOrder&sortOrder=asc',
    { method: 'GET' },
  )
  const data = res.data
  return Array.isArray(data) ? data : []
}

export async function listCallOffVisits(params: Record<string, string | number | undefined> = {}) {
  const res = await apiJson<ApiEnvelope<CallOffVisitRow[]>>(
    `/call-off-visits${buildQuery(params)}`,
    { method: 'GET' },
  )
  return { rows: res.data ?? [], meta: res.meta as PaginationMeta | undefined }
}

export async function createCallOffVisit(payload: {
  serviceUserId: string
  callOffDate: string
  reason: string
  notes?: string
  scheduledJobId?: string
}) {
  const res = await apiJson<ApiEnvelope<CallOffVisitRow>>('/call-off-visits', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data!
}
