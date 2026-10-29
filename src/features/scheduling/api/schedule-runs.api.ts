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
  /** Visits over the carer's weekly hours, waiting for a manager on Hours approvals. */
  approvalRequested?: Array<{ jobId: string; approvalId: string | null }>
  /** Visits the run carer is now on. */
  synced?: number
}

export async function syncScheduleRunCarer(
  id: string,
  payload: SyncScheduleRunCarerPayload = {},
  init?: RequestInit,
): Promise<SyncScheduleRunCarerResult> {
  const res = await apiJson<ApiEnvelope<ScheduleRunRow>>(`/schedule-runs/${id}/sync-carer`, {
    method: 'POST',
    body: JSON.stringify(payload),
    ...init,
  })
  // The details come back in meta (only message, data and meta reach the client).
  const meta = (res.meta ?? {}) as Omit<SyncScheduleRunCarerResult, 'run'>
  return {
    run: res.data!,
    warnings: meta.warnings,
    approvalRequested: meta.approvalRequested,
    synced: meta.synced,
  }
}

/** One visit of a run: what putting the chosen carer on it would do (nothing is saved). */
export type RunCarerPreviewVisit = {
  jobId: string
  outcome: 'ALREADY' | 'ALLOCATE' | 'NEEDS_APPROVAL' | 'BLOCKED'
  message: string | null
  overWeeklyHours: boolean
  /** Carers the run carer would take the place of. */
  replaceNames: string[]
}

export type RunCarerPreview = {
  visits: RunCarerPreviewVisit[]
  weeks: Array<{
    weekStart: string
    beforeHours: number
    afterHours: number
    limitHours: number | null
    extraHours: number
  }>
  maxHours: number
}

export async function previewRunCarer(
  body: { employeeId: string; visitIds: string[]; replaceExisting?: boolean; releaseEmployeeId?: string },
  init?: RequestInit,
): Promise<RunCarerPreview> {
  const res = await apiJson<ApiEnvelope<RunCarerPreview>>('/schedule-runs/carer-preview', {
    method: 'POST',
    body: JSON.stringify(body),
    ...init,
  })
  return res.data
}
