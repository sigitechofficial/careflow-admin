import { apiJson, ApiError, type ApiEnvelope } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import type {
  VisitVoiceNote,
  VisitVoiceNoteGroup,
  VisitVoiceNotesResponse,
} from '@/features/scheduling/types/visit-voice-note.types'
import type { CancelHousekeepingJobPayload } from '@/features/scheduling/utils/visit-cancellation.constants'
import type {
  CarePlanDeliveryTasksResponse,
  DeliveredCarePlanDetail,
} from '@/features/scheduling/types/visit-care-plan-delivery.types'
import type { VisitJobTasksResponse } from '@/features/scheduling/types/visit-job-tasks.types'
import type {
  CallOffVisitRow,
  DateRangeQuery,
  EmployeesDayTimelineResponse,
  HousekeepingJob,
  JobsDayRunsResponse,
  PaginationMeta,
  ReportTypeRow,
  ScheduleAreaRow,
  ScheduleStatusResponse,
  ServiceUsersWeekTimelineResponse,
  TimelineJob,
  EmployeesMonthTimelineResponse,
} from '../types/scheduling.types'

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function getScheduleReportTypes(init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<ReportTypeRow[]>>('/schedule-reports/report-types', { method: 'GET', ...init })
  return res.data ?? []
}

export async function getJobsDayRuns(date: string, params: { scheduleBatchId?: string; limit?: number } = {}, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<JobsDayRunsResponse>>(
    `/schedule-timelines/jobs/day-runs${buildQuery({ date, limit: params.limit ?? 200, ...params })}`,
    { method: 'GET', ...init },
  )
  return res.data!
}

export async function getJobsDayTimeline(date: string, params: { scheduleBatchId?: string; limit?: number } = {}, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<{ date: string; jobs: TimelineJob[] }>>(
    `/schedule-timelines/jobs/day-timeline${buildQuery({ date, limit: params.limit ?? 200, ...params })}`,
    { method: 'GET', ...init },
  )
  return { jobs: res.data?.jobs ?? [], meta: res.meta as PaginationMeta | undefined }
}

export type TravelLegPoint = { lat: number; lng: number }
export type TravelLeg = { km: number; minutes: number; source: 'GOOGLE' | 'ESTIMATE' }

/** Driving distance and time of each journey, in the order asked (null = same place). Up to 200 per call. */
export async function getTravelLegs(pairs: { from: TravelLegPoint; to: TravelLegPoint }[]) {
  const res = await apiJson<ApiEnvelope<(TravelLeg | null)[]>>('/schedule-timelines/travel-legs', {
    method: 'POST',
    body: JSON.stringify({ pairs }),
  })
  return res.data ?? []
}

export async function getServiceUsersWeekTimeline(
  weekStart: string,
  params: { limit?: number } = {},
  init?: RequestInit,
) {
  const pageSize = Math.min(params.limit ?? 200, 200)
  const byServiceUser = new Map<
    string,
    ServiceUsersWeekTimelineResponse['serviceUsers'][number]
  >()
  let page = 1
  let weekStartLabel = weekStart
  let weekEndLabel = weekStart
  let lastMeta: PaginationMeta | undefined

  for (;;) {
    const res = await apiJson<ApiEnvelope<ServiceUsersWeekTimelineResponse>>(
      `/schedule-timelines/service-users/week${buildQuery({ weekStart, limit: pageSize, page })}`,
      { method: 'GET', ...init },
    )
    const data = res.data!
    weekStartLabel = data.weekStart
    weekEndLabel = data.weekEnd
    lastMeta = res.meta as PaginationMeta | undefined

    for (const row of data.serviceUsers) {
      const suId = row.serviceUser.id
      const existing = byServiceUser.get(suId)
      if (!existing) {
        byServiceUser.set(suId, { serviceUser: row.serviceUser, jobs: [...row.jobs] })
      } else {
        existing.jobs.push(...row.jobs)
      }
    }

    const hasNext =
      lastMeta?.hasNextPage ??
      (lastMeta?.totalPages != null ? page < lastMeta.totalPages : false)
    if (!hasNext || (data.serviceUsers.length === 0 && page > 1)) break
    page += 1
  }

  return {
    weekStart: weekStartLabel,
    weekEnd: weekEndLabel,
    serviceUsers: [...byServiceUser.values()],
  }
}

export async function getEmployeesDayTimeline(
  date: string,
  params: { limit?: number; page?: number } = {},
  init?: RequestInit,
) {
  const pageSize = Math.min(params.limit ?? 200, 200)
  const allEmployees: EmployeesDayTimelineResponse['employees'] = []
  let page = params.page ?? 1
  let dateLabel = date
  let lastMeta: PaginationMeta | undefined

  for (;;) {
    const res = await apiJson<ApiEnvelope<EmployeesDayTimelineResponse>>(
      `/schedule-timelines/employees/day${buildQuery({ date, limit: pageSize, page })}`,
      { method: 'GET', ...init },
    )
    dateLabel = res.data?.date ?? date
    const rows = res.data?.employees ?? []
    allEmployees.push(...rows)
    lastMeta = res.meta as PaginationMeta | undefined

    const hasNext =
      lastMeta?.hasNextPage ??
      (lastMeta?.totalPages != null
        ? page < lastMeta.totalPages
        : lastMeta?.total != null
          ? allEmployees.length < lastMeta.total
          : rows.length >= pageSize)

    if (!hasNext || rows.length === 0) break
    page += 1
    if (page > 50) break
  }

  return {
    date: dateLabel,
    employees: allEmployees,
    meta: lastMeta,
  }
}

export async function getEmployeesMonthTimeline(
  month: string,
  params: { employeeIds?: string[]; limit?: number } = {},
  init?: RequestInit,
) {
  const q = new URLSearchParams()
  q.set('month', month)
  q.set('limit', String(params.limit ?? 50))
  for (const id of params.employeeIds ?? []) {
    q.append('employeeIds', id)
  }
  const res = await apiJson<ApiEnvelope<EmployeesMonthTimelineResponse>>(
    `/schedule-timelines/employees/month?${q.toString()}`,
    { method: 'GET', ...init },
  )
  return {
    month: res.data?.month ?? month,
    employees: res.data?.employees ?? [],
    meta: res.meta as PaginationMeta | undefined,
  }
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

export async function fetchCarePlanDeliveryTasks(
  jobId: string,
  formIds: string[],
  options?: { signal?: AbortSignal },
): Promise<CarePlanDeliveryTasksResponse> {
  const query = formIds.length ? buildQuery({ formIds: formIds.join(',') }) : ''
  const res = await apiJson<ApiEnvelope<CarePlanDeliveryTasksResponse>>(
    `/scheduled-jobs-housekeeping/jobs/${jobId}/care-plan-delivery-tasks${query}`,
    { method: 'GET', signal: options?.signal },
  )
  return (
    res.data ?? {
      linkedCarePlanFormIds: [],
      plans: [],
    }
  )
}

export async function fetchVisitJobTasks(
  jobId: string,
  options?: { signal?: AbortSignal },
): Promise<VisitJobTasksResponse> {
  const res = await apiJson<ApiEnvelope<VisitJobTasksResponse>>(
    `/scheduled-jobs-housekeeping/jobs/${jobId}/visit-tasks`,
    { method: 'GET', signal: options?.signal },
  )
  return (
    res.data ?? {
      medicationRoundCode: null,
      roundLabel: null,
      windowStart: null,
      windowEnd: null,
      tasks: [],
    }
  )
}

export type VisitObservationCatalogItem = {
  id: string
  typeCode: string
  observationTypeCode: string
  label: string
  subtitle?: string | null
  description?: string | null
  unit?: string | null
  normalRangeLabel?: string | null
}

export type VisitObservationCatalogSection = {
  id: string
  label: string
  items: VisitObservationCatalogItem[]
}

export type VisitObservationFormField = {
  key: string
  label: string
  inputType: 'number' | 'text' | 'textarea' | 'select' | 'boolean' | 'score' | 'datetime'
  required: boolean
  unit?: string | null
  placeholder?: string | null
  helperText?: string | null
  min?: number | null
  max?: number | null
  step?: number | null
  options?: Array<{ value: string; label: string }>
  payloadPath?: string | null
}

export type VisitObservationDefinition = {
  typeCode: string
  observationTypeCode: string
  label: string
  description?: string | null
  unit?: string | null
  valueKind?: string
  previousValue?: string | null
  form: {
    title: string
    subtitle: string | null
    submitLabel: string
    unableLabel: string
    fields: VisitObservationFormField[]
    showUnableToRecord: boolean
  }
}

export type VisitObservationBodyMapPin = {
  view: string
  x: number
  y: number
  part: string
  canvasView?: string
  recordView?: string
}

export type VisitObservationRecordedRow = {
  id: string
  title: string
  observationTypeCode: string
  valueLabel: string | null
  notes?: string | null
  recordedAt: string
  statusLabel?: string | null
  bodyMapPins?: VisitObservationBodyMapPin[]
  photos?: Array<{
    id: string
    fileUrl: string
    caption?: string | null
    consentStatus?: string
  }>
}

export type VisitObservationsResponse = {
  scheduledJobId: string
  scheduledVisitId: string | null
  serviceUserId: string
  catalog: {
    title: string
    anotherTitle: string
    searchPlaceholder: string
    sections: VisitObservationCatalogSection[]
  }
  definitionsByTypeCode: Record<string, VisitObservationDefinition>
  suggested: VisitObservationCatalogItem[]
  recordedThisVisit: VisitObservationRecordedRow[]
  recordedCount: number
  unableReasons: Array<{
    code: string
    label: string
    resolvesRequirement: boolean
    requiresNotes: boolean
  }>
}

export async function fetchVisitObservations(
  jobId: string,
  options?: { signal?: AbortSignal },
): Promise<VisitObservationsResponse> {
  const res = await apiJson<ApiEnvelope<VisitObservationsResponse>>(
    `/scheduled-jobs-housekeeping/jobs/${jobId}/visit-observations`,
    { method: 'GET', signal: options?.signal },
  )
  if (!res.data) {
    throw new Error('No visit observations data returned')
  }
  return res.data
}

export type VisitTimelineItem = {
  id: string
  time: string
  timeLabel: string
  title: string
  detail: string | null
  subtitle: string | null
  tone: 'primary' | 'success' | 'danger' | 'warning' | 'teal' | 'ink' | null
  type: string
  occurredAt: string
  sourceType: string
  /** Notes / handover / concerns / incidents: who wrote it and their role on the visit then. */
  author?: {
    employeeId: string
    name: string
    role: 'lead' | 'support' | null
    label: string
  } | null
  photos?: Array<{
    id: string
    fileUrl: string
    caption?: string | null
  }>
  /** Carer voice notes (max 3, recording order) on a note / handover / concern; uploaded ones only. */
  voiceNotes?: VisitVoiceNote[]
}

export type VisitTimelineResponse = {
  jobId: string
  timeline: VisitTimelineItem[]
  /** Voice notes on records with no timeline row (SOS, check-in request, body map review). */
  otherVoiceNotes?: VisitVoiceNoteGroup[]
}

export async function fetchVisitTimeline(
  jobId: string,
  options?: { signal?: AbortSignal },
): Promise<VisitTimelineResponse> {
  const res = await apiJson<ApiEnvelope<VisitTimelineResponse>>(
    `/scheduled-jobs-housekeeping/jobs/${jobId}/timeline`,
    { method: 'GET', signal: options?.signal },
  )
  return res.data ?? { jobId, timeline: [] }
}

/** Every carer voice note on a visit, grouped by the carer-app record it belongs to. */
export async function fetchVisitVoiceNotes(
  jobId: string,
  options?: { signal?: AbortSignal },
): Promise<VisitVoiceNotesResponse> {
  const res = await apiJson<ApiEnvelope<VisitVoiceNotesResponse>>(
    `/scheduled-jobs-housekeeping/jobs/${jobId}/voice-notes`,
    { method: 'GET', signal: options?.signal },
  )
  return res.data ?? { jobId, groups: [] }
}

/**
 * Fetch a voice note's audio with the auth token and return an object URL for
 * an <audio> element. The caller MUST revoke it (URL.revokeObjectURL) when done.
 */
export async function fetchVisitVoiceNoteObjectUrl(
  voiceNote: Pick<VisitVoiceNote, 'downloadUrl'>,
  options?: { signal?: AbortSignal },
): Promise<string> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured.', 0)
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${base}${voiceNote.downloadUrl}`, { headers, signal: options?.signal })
  if (!res.ok) throw new ApiError('Could not load the voice note', res.status)
  return URL.createObjectURL(await res.blob())
}

export async function saveVisitJobTasks(
  jobId: string,
  tasks: Array<{
    assignmentId?: string
    taskCatalogueTaskId?: string
    isExtra?: boolean
    isCompleted: boolean
    outcome?: string
    recordedValue?: string
    notes?: string
  }>,
): Promise<VisitJobTasksResponse> {
  const res = await apiJson<ApiEnvelope<VisitJobTasksResponse>>(
    `/scheduled-jobs-housekeeping/jobs/${jobId}/visit-tasks`,
    {
      method: 'PATCH',
      body: JSON.stringify({ tasks }),
    },
  )
  return (
    res.data ?? {
      medicationRoundCode: null,
      roundLabel: null,
      windowStart: null,
      windowEnd: null,
      tasks: [],
    }
  )
}

export async function completeHousekeepingJob(
  id: string,
  payload?: {
    status?: string
    notes?: string
    deliveredCarePlanFormIds?: string[]
    deliveredCarePlanDetails?: DeliveredCarePlanDetail[]
    extraCareNotes?: string
    actualStartDateTime?: string
    actualEndDateTime?: string
    carerActuals?: Array<{
      allocationId: string
      actualStartDateTime: string
      /** Omitted when marking visit Started (start-only). */
      actualEndDateTime?: string
    }>
    overrunReason?: string
    timingExceptionReasonCode?: string
    timingExceptionNotes?: string
    missedReasonCode?: string
    missedReasonNotes?: string
    careNotDelivered?: boolean
    careNotDeliveredReasonCode?: string
    careNotDeliveredNotes?: string
  },
) {
  const body: Record<string, unknown> = {}
  if (payload?.status) body.status = payload.status
  if (payload?.notes?.trim()) body.notes = payload.notes.trim()
  if (payload?.deliveredCarePlanFormIds?.length) {
    body.deliveredCarePlanFormIds = payload.deliveredCarePlanFormIds
  }
  if (payload?.deliveredCarePlanDetails?.length) {
    body.deliveredCarePlanDetails = payload.deliveredCarePlanDetails
  }
  if (payload?.extraCareNotes?.trim()) body.extraCareNotes = payload.extraCareNotes.trim()
  if (payload?.actualStartDateTime) body.actualStartDateTime = payload.actualStartDateTime
  if (payload?.actualEndDateTime) body.actualEndDateTime = payload.actualEndDateTime
  if (payload?.carerActuals?.length) body.carerActuals = payload.carerActuals
  if (payload?.overrunReason?.trim()) body.overrunReason = payload.overrunReason.trim()
  if (payload?.timingExceptionReasonCode?.trim()) {
    body.timingExceptionReasonCode = payload.timingExceptionReasonCode.trim()
  }
  if (payload?.timingExceptionNotes?.trim()) {
    body.timingExceptionNotes = payload.timingExceptionNotes.trim()
  }
  if (payload?.missedReasonCode?.trim()) {
    body.missedReasonCode = payload.missedReasonCode.trim()
  }
  if (payload?.missedReasonNotes?.trim()) {
    body.missedReasonNotes = payload.missedReasonNotes.trim()
  }
  if (payload?.careNotDelivered === true) body.careNotDelivered = true
  if (payload?.careNotDelivered === false) body.careNotDelivered = false
  if (payload?.careNotDeliveredReasonCode?.trim()) {
    body.careNotDeliveredReasonCode = payload.careNotDeliveredReasonCode.trim()
  }
  if (payload?.careNotDeliveredNotes?.trim()) {
    body.careNotDeliveredNotes = payload.careNotDeliveredNotes.trim()
  }
  const res = await apiJson<ApiEnvelope<unknown>>(`/scheduled-jobs-housekeeping/jobs/${id}/complete`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res
}

export async function cancelHousekeepingJob(id: string, payload: CancelHousekeepingJobPayload) {
  const res = await apiJson<ApiEnvelope<unknown>>(`/scheduled-jobs-housekeeping/jobs/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return res
}

export async function reinstateHousekeepingJob(id: string, payload?: { notes?: string }) {
  const res = await apiJson<ApiEnvelope<unknown>>(`/scheduled-jobs-housekeeping/jobs/${id}/reinstate`, {
    method: 'PATCH',
    body: JSON.stringify(payload ?? {}),
  })
  return res
}

export async function resetHousekeepingJobDelivery(id: string, payload: { reason: string }) {
  const res = await apiJson<ApiEnvelope<unknown>>(
    `/scheduled-jobs-housekeeping/jobs/${id}/reset-delivery`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return res
}

export async function resetHousekeepingJobTask(
  jobId: string,
  assignmentId: string,
  payload: { reason: string },
): Promise<VisitJobTasksResponse> {
  const res = await apiJson<ApiEnvelope<VisitJobTasksResponse>>(
    `/scheduled-jobs-housekeeping/jobs/${jobId}/tasks/${encodeURIComponent(assignmentId)}/reset`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return (
    res.data ?? {
      medicationRoundCode: null,
      roundLabel: null,
      windowStart: null,
      windowEnd: null,
      tasks: [],
    }
  )
}

export async function getScheduleReport(
  endpoint: string,
  query: DateRangeQuery,
  init?: RequestInit,
): Promise<{ data: unknown; meta?: PaginationMeta; export?: unknown }> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const res = await apiJson<ApiEnvelope<unknown>>(
    `${path}${buildQuery(query as Record<string, string | number | boolean | undefined>)}`,
    { method: 'GET', ...init },
  )
  return { data: res.data, meta: res.meta as PaginationMeta | undefined, export: (res as { export?: unknown }).export }
}

export async function getScheduleStatus(date: string, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<ScheduleStatusResponse>>(
    `/schedules/status${buildQuery({ date })}`,
    { method: 'GET', ...init },
  )
  const payload = res.data as ScheduleStatusResponse | { data: ScheduleStatusResponse }
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return normalizeScheduleStatusResponse(payload.data as ScheduleStatusResponse)
  }
  return normalizeScheduleStatusResponse(payload as ScheduleStatusResponse)
}

function normalizeScheduleStatusResponse(payload: ScheduleStatusResponse): ScheduleStatusResponse {
  return {
    ...payload,
    areas: payload.areas ?? [],
  }
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

export async function listScheduleAreas(init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<ScheduleAreaRow[]>>(
    '/schedule-areas?limit=100&isActive=true&sortBy=sortOrder&sortOrder=asc',
    { method: 'GET', ...init },
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

export type JobAllocationRow = {
  id: string
  scheduledJobId: string
  scheduledVisitId: string | null
  employeeId: string
  status: string
  isLeadCarer?: boolean
  requiresConfirmation: boolean
  scheduledStartDateTime?: string | null
  scheduledEndDateTime?: string | null
  durationMinutes?: number | null
  resolvedStartDateTime?: string | null
  resolvedEndDateTime?: string | null
  resolvedDurationMinutes?: number | null
  hasExplicitTiming?: boolean
  scheduledJob?: {
    serviceUserId?: string | null
  } | null
  employee: {
    id: string
    personalDetail?: { firstName?: string; lastName?: string; email?: string | null } | null
  } | null
}

export async function listJobAllocations(jobId: string, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<JobAllocationRow[]>>(
    `/scheduled-jobs/${jobId}/allocations`,
    { method: 'GET', ...init },
  )
  return res.data ?? []
}

export async function getScheduledJob(jobId: string, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<TimelineJob>>(`/scheduled-jobs/${jobId}`, {
    method: 'GET',
    ...init,
  })
  if (!res.data) throw new Error('Scheduled job not found')
  return res.data
}

export type VisitCareConsentRow = {
  status: 'GRANTED' | 'DECLINED'
  reason: string | null
  recordedAt: string | null
  capturedByEmployeeId: string | null
  capturedByName: string | null
}

export type VisitCareConsentsPayload = {
  required: boolean
  consents: VisitCareConsentRow[]
}

export async function fetchVisitCareConsents(jobId: string, init?: RequestInit) {
  const res = await apiJson<ApiEnvelope<VisitCareConsentsPayload>>(
    `/scheduled-jobs/${jobId}/care-consents`,
    { method: 'GET', ...init },
  )
  return res.data ?? { required: true, consents: [] }
}

export async function clearVisitCareConsents(jobId: string) {
  const res = await apiJson<ApiEnvelope<VisitCareConsentsPayload>>(
    `/scheduled-jobs/${jobId}/care-consents`,
    { method: 'DELETE' },
  )
  return res.data ?? { required: true, consents: [] }
}

export async function updateScheduledJob(
  jobId: string,
  body: {
    scheduledStartDateTime?: string
    scheduledEndDateTime?: string | null
    notes?: string | null
  },
) {
  const res = await apiJson<ApiEnvelope<unknown>>(`/scheduled-jobs/${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res
}

export async function allocateJob(
  jobId: string,
  body: {
    employeeId: string
    scheduledVisitId?: string
    force?: boolean
    notes?: string
    isLeadCarer?: boolean
    scheduledStartDateTime?: string
    scheduledEndDateTime?: string
  },
) {
  const res = await apiJson<ApiEnvelope<JobAllocationRow>>(`/scheduled-jobs/${jobId}/allocate`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return { message: res.message, data: res.data! }
}

export type TeamCarerCheck = {
  employeeId: string
  name: string
  hardBlocked: boolean
  requiresConfirmation: boolean
  warnings: Array<{ type: string; message: string; severity: string }>
}

/** Multi-carer visit: allocate all (or the missing) carers in one save, with one lead. */
export async function allocateJobTeam(
  jobId: string,
  body: {
    employeeIds: string[]
    leadEmployeeId: string
    scheduledVisitId?: string
    force?: boolean
    notes?: string
    scheduledStartDateTime?: string
    scheduledEndDateTime?: string
  },
) {
  const res = await apiJson<ApiEnvelope<JobAllocationRow[]>>(
    `/scheduled-jobs/${jobId}/allocate-team`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  const meta = (res.meta ?? {}) as {
    requiresConfirmation?: boolean
    leadEmployeeId?: string
    carers?: TeamCarerCheck[]
  }
  return {
    message: res.message,
    data: res.data ?? [],
    requiresConfirmation: Boolean(meta.requiresConfirmation),
    leadEmployeeId: meta.leadEmployeeId ?? body.leadEmployeeId,
  }
}

export async function updateJobAllocationTiming(
  jobId: string,
  allocationId: string,
  body: {
    scheduledStartDateTime?: string
    scheduledEndDateTime?: string
    isLeadCarer?: boolean
    notes?: string
  },
) {
  const res = await apiJson<ApiEnvelope<JobAllocationRow>>(
    `/scheduled-jobs/${jobId}/allocations/${allocationId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  )
  return { message: res.message, data: res.data! }
}

export async function setJobLeadCarer(jobId: string, body: { employeeId: string }) {
  const res = await apiJson<ApiEnvelope<JobAllocationRow>>(`/scheduled-jobs/${jobId}/lead-carer`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return { message: res.message, data: res.data! }
}

export async function unallocateJob(jobId: string, body: { employeeId: string; reason?: string }) {
  const res = await apiJson<ApiEnvelope<JobAllocationRow>>(`/scheduled-jobs/${jobId}/unallocate`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const meta = (res.meta ?? {}) as {
    /** Set when the removed carer was lead and another carer was promoted. */
    promotedLeadCarer?: { employeeId: string; name: string } | null
  }
  return {
    message: res.message,
    data: res.data!,
    promotedLeadCarer: meta.promotedLeadCarer ?? null,
  }
}

export async function confirmJobAllocation(
  jobId: string,
  allocationId: string,
  body: { notes?: string } = {},
) {
  const res = await apiJson<ApiEnvelope<JobAllocationRow>>(
    `/scheduled-jobs/${jobId}/allocations/${allocationId}/confirm`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return { message: res.message, data: res.data! }
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
