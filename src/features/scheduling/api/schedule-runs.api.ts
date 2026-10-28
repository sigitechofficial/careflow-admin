import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { PaginationMeta, ScheduleRunRow, ScheduleRunStatus } from '../types/scheduling.types'

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export type ListScheduleRunsParams = {
  runDate?: string
  runDateFrom?: string
  runDateTo?: string
  employeeId?: string
  status?: ScheduleRunStatus
  includeJobs?: boolean
  page?: number
  limit?: number
}

export type CreateScheduleRunPayload = {
  name: string
  runDate: string
  employeeId?: string
  description?: string
  shiftType?: string
  scheduleBatchId?: string
  visitIds?: string[]
}

export type UpdateScheduleRunPayload = Partial<CreateScheduleRunPayload> & {
  status?: ScheduleRunStatus
  employeeId?: string | null
}

export async function listScheduleRuns(params: ListScheduleRunsParams = {}, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<ScheduleRunRow[]>>(
    `/schedule-runs${buildQuery({
      runDate: params.runDate,
      runDateFrom: params.runDateFrom,
      runDateTo: params.runDateTo,
      employeeId: params.employeeId,
      status: params.status,
      includeJobs: params.includeJobs,
      page: params.page,
      limit: params.limit,
    })}`,
    { method: 'GET', ...init },
  )
  return { rows: res.data ?? [], meta: res.meta as PaginationMeta | undefined }
}

export async function getScheduleRun(id: string, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<ScheduleRunRow>>(
    `/schedule-runs/${id}?includeJobs=true`,
    { method: 'GET', ...init },
  )
  return res.data!
}

export async function createScheduleRun(payload: CreateScheduleRunPayload, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<ScheduleRunRow>>('/schedule-runs', {
    method: 'POST',
    body: JSON.stringify(payload),
    ...init,
  })
  return res.data!
}

export async function updateScheduleRun(id: string, payload: UpdateScheduleRunPayload, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<ScheduleRunRow>>(`/schedule-runs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    ...init,
  })
  return res.data!
}

export async function addJobsToScheduleRun(id: string, visitIds: string[], init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<ScheduleRunRow>>(`/schedule-runs/${id}/jobs`, {
    method: 'POST',
    body: JSON.stringify({ visitIds }),
    ...init,
  })
  return res.data!
}

export async function removeJobFromScheduleRun(runId: string, jobId: string, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<ScheduleRunRow>>(`/schedule-runs/${runId}/jobs/${jobId}`, {
    method: 'DELETE',
    ...init,
  })
  return res.data!
}

export async function reorderScheduleRunJobs(id: string, visitIds: string[], init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<ScheduleRunRow>>(`/schedule-runs/${id}/jobs/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ visitIds }),
    ...init,
  })
  return res.data!
}

export async function cancelScheduleRun(id: string, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<ScheduleRunRow>>(`/schedule-runs/${id}/cancel`, {
    method: 'POST',
    ...init,
  })
  return res.data!
}

export async function deleteScheduleRun(id: string, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<ScheduleRunRow>>(`/schedule-runs/${id}`, {
    method: 'DELETE',
    ...init,
  })
  return res.data!
}

export type SyncScheduleRunCarerPayload = {
  force?: boolean
  unallocateEmployeeId?: string
  /** On single-carer visits, take off whoever holds the visit so the run carer gets it. */
  replaceExisting?: boolean
}

export type SyncScheduleRunCarerResult = {
  run: ScheduleRunRow
  warnings?: Array<{ jobId: string; message: string }>
}

export async function syncScheduleRunCarer(
  id: string,
  payload: SyncScheduleRunCarerPayload = {},
  init?: RequestInit,
) {
  const res = await apiJson<ApiEnvelope<ScheduleRunRow> & { warnings?: SyncScheduleRunCarerResult['warnings'] }>(
    `/schedule-runs/${id}/sync-carer`,
    { method: 'POST', body: JSON.stringify(payload), ...init },
  )
  return {
    run: res.data!,
    warnings: res.warnings,
  }
}
