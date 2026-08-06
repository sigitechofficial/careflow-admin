import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { MedicationRoundRow } from '@/features/settings/api/medication-settings.api'
import {
  defaultEditableVisitPlanSlots,
} from '@/features/service-users/visit-plan/visit-plan-time-slots.util'
import type {
  ActivateImpactPreview,
  AmendmentImpactPreview,
  GenerateSchedulePreview,
  ReturnImpactPreview,
  ScheduleImpactSummary,
  ServiceUserVisitPlan,
  SuspensionReviewOverdueRow,
  VisitPlanCarerSuggestions,
  VisitPlanCarerSyncPatternPreview,
  VisitPlanSlot,
  VisitPlanSlotCode,
  VisitPlanSlotCarerAssignment,
  VisitPlanSlotException,
} from '@/features/service-users/visit-plan/types'
import { resolveEditableVisitPlan } from '@/features/service-users/visit-plan/visit-plan-version.util'

function isVisitPlan(value: unknown): value is ServiceUserVisitPlan {
  return (
    value !== null &&
    typeof value === 'object' &&
    'id' in value &&
    typeof (value as ServiceUserVisitPlan).id === 'string' &&
    (value as ServiceUserVisitPlan).id.length > 0 &&
    'status' in value
  )
}

/** Unwrap plan payloads that may be nested ({ data: plan } or { message, data: plan }). */
function unwrapVisitPlan(raw: unknown): ServiceUserVisitPlan | null {
  if (isVisitPlan(raw)) return normalizeVisitPlan(raw)
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const inner = (raw as { data: unknown }).data
    if (isVisitPlan(inner)) return normalizeVisitPlan(inner)
  }
  return null
}

const SLOT_OPTION_DEFAULTS = {
  scheduleFrequency: 'DAILY' as const,
  repeatEvery: 1,
  repeatUnit: 'DAYS' as const,
  timeCritical: false,
  timeToleranceMinutes: 30,
  durationMinutes: null as number | null,
  notesRequired: false,
  photoAllowed: false,
  shareOutcomeWithFamily: false,
  analysisArea: null as string | null,
  monthlyDayMode: 'BY_DATE' as const,
  monthlyDaysOfMonth: [] as number[],
  monthlyPatternOrdinal: 'FIRST' as const,
  monthlyPatternWeekday: 1,
  linkedCarePlanFormIds: [] as string[],
  assignedEmployeeIds: [] as string[],
  slotKind: 'STANDARD' as const,
  slotEffectiveFrom: null as string | null,
  slotEffectiveTo: null as string | null,
  oneOffDate: null as string | null,
  allowBackfillDays: 0,
  carerAssignments: [] as VisitPlanSlot['carerAssignments'],
  exceptions: [] as VisitPlanSlot['exceptions'],
}

function normalizeSlot(slot: VisitPlanSlot): VisitPlanSlot {
  const carerAssignments = Array.isArray(slot.carerAssignments) ? slot.carerAssignments : []
  const exceptions = Array.isArray(slot.exceptions) ? slot.exceptions : []
  const assignedFromRows = [
    ...new Set(carerAssignments.map((a) => a.employeeId?.trim()).filter((id): id is string => Boolean(id))),
  ]
  return {
    ...SLOT_OPTION_DEFAULTS,
    ...slot,
    daysOfWeek: Array.isArray(slot.daysOfWeek) ? slot.daysOfWeek : [],
    linkedCarePlanFormIds: Array.isArray(slot.linkedCarePlanFormIds) ? slot.linkedCarePlanFormIds : [],
    assignedEmployeeIds: assignedFromRows.length
      ? assignedFromRows
      : Array.isArray(slot.assignedEmployeeIds)
        ? slot.assignedEmployeeIds
        : [],
    carerAssignments,
    exceptions,
  }
}

function normalizeVisitPlan(plan: ServiceUserVisitPlan): ServiceUserVisitPlan {
  return {
    ...plan,
    suspensionContingencyNotes: plan.suspensionContingencyNotes ?? '',
    slots: Array.isArray(plan.slots) ? plan.slots.map(normalizeSlot) : [],
    amendments: Array.isArray(plan.amendments) ? plan.amendments : [],
    statusEvents: Array.isArray(plan.statusEvents) ? plan.statusEvents : [],
  }
}

function unwrapVisitPlanList(raw: unknown): ServiceUserVisitPlan[] {
  if (Array.isArray(raw)) {
    return raw.map(unwrapVisitPlan).filter((p): p is ServiceUserVisitPlan => p !== null)
  }
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const inner = (raw as { data: unknown }).data
    if (Array.isArray(inner)) {
      return inner.map(unwrapVisitPlan).filter((p): p is ServiceUserVisitPlan => p !== null)
    }
    const one = unwrapVisitPlan(inner)
    return one ? [one] : []
  }
  const one = unwrapVisitPlan(raw)
  return one ? [one] : []
}

export type VisitPlanSlotInput = {
  slotCode: VisitPlanSlotCode
  daysOfWeek: number[]
  plannedStartTime: string
  plannedEndTime: string
  requiredCarers?: number
  isEnabled?: boolean
  medicationRoundCode?: string | null
  notes?: string
  scheduleFrequency?: VisitPlanSlot['scheduleFrequency']
  repeatEvery?: number
  repeatUnit?: VisitPlanSlot['repeatUnit']
  timeCritical?: boolean
  timeToleranceMinutes?: number
  durationMinutes?: number | null
  notesRequired?: boolean
  photoAllowed?: boolean
  shareOutcomeWithFamily?: boolean
  analysisArea?: string | null
  monthlyDayMode?: VisitPlanSlot['monthlyDayMode']
  monthlyDaysOfMonth?: number[]
  monthlyPatternOrdinal?: VisitPlanSlot['monthlyPatternOrdinal']
  monthlyPatternWeekday?: number | null
  linkedCarePlanFormIds?: string[]
  assignedEmployeeIds?: string[]
  slotKind?: VisitPlanSlot['slotKind']
  slotEffectiveFrom?: string | null
  slotEffectiveTo?: string | null
  oneOffDate?: string | null
  allowBackfillDays?: number
  carerAssignments?: VisitPlanSlotCarerAssignment[]
  exceptions?: VisitPlanSlotException[]
}

export async function suggestVisitPlanCarers(
  serviceUserId: string,
  body: {
    slotCode: VisitPlanSlotCode
    daysOfWeek: number[]
    plannedStartTime: string
    plannedEndTime: string
    requiredCarers?: number
    linkedCarePlanFormIds?: string[]
    scheduledDate?: string
    excludeScheduledJobId?: string
    includeEmployeeIds?: string[]
  },
) {
  const res = await apiJson<ApiEnvelope<VisitPlanCarerSuggestions>>(
    `/service-users/${serviceUserId}/visit-plans/suggest-carers`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function fetchServiceUserVisitPlans(serviceUserId: string) {
  const res = await apiJson<ApiEnvelope<ServiceUserVisitPlan[]>>(
    `/service-users/${serviceUserId}/visit-plans`,
  )
  return unwrapVisitPlanList(res.data)
}

export async function fetchActiveServiceUserVisitPlan(serviceUserId: string) {
  const res = await apiJson<ApiEnvelope<unknown>>(
    `/service-users/${serviceUserId}/visit-plans/active`,
  )
  return unwrapVisitPlan(res.data)
}

/** Active plan first; otherwise suspended or draft (for contracted-hours checks). */
export async function fetchWorkingServiceUserVisitPlan(serviceUserId: string) {
  const active = await fetchActiveServiceUserVisitPlan(serviceUserId)
  const plans = await fetchServiceUserVisitPlans(serviceUserId)
  return resolveEditableVisitPlan(plans, active)
}

export async function createServiceUserVisitPlan(
  serviceUserId: string,
  body: {
    weeklyContractedHours: string
    numberOfCarers?: number
    notes?: string
    slots?: VisitPlanSlotInput[]
  },
) {
  const res = await apiJson<ApiEnvelope<ServiceUserVisitPlan>>(
    `/service-users/${serviceUserId}/visit-plans`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  const plan = unwrapVisitPlan(res.data)
  if (!plan) throw new Error('Invalid visit plan response from API')
  return plan
}

export async function updateServiceUserVisitPlan(
  serviceUserId: string,
  planId: string,
  body: {
    amendmentReason: string
    weeklyContractedHours?: string | null
    numberOfCarers?: number
    notes?: string
    slots?: VisitPlanSlotInput[]
    applyScheduleImpact?: boolean
    respectWorkingPatternOnSync?: boolean
  },
) {
  const res = await apiJson<
    ApiEnvelope<ServiceUserVisitPlan> & { scheduleImpact?: ScheduleImpactSummary }
  >(`/service-users/${serviceUserId}/visit-plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  const plan = unwrapVisitPlan(res.data)
  if (!plan) throw new Error('Invalid visit plan response from API')
  return { plan, scheduleImpact: res.scheduleImpact }
}

export async function previewVisitPlanAmendmentImpact(
  serviceUserId: string,
  planId: string,
  body: {
    amendmentReason: string
    weeklyContractedHours?: string | null
    numberOfCarers?: number
    notes?: string
    slots?: VisitPlanSlotInput[]
  },
) {
  const res = await apiJson<ApiEnvelope<AmendmentImpactPreview>>(
    `/service-users/${serviceUserId}/visit-plans/${planId}/amendment-impact-preview`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function previewVisitPlanCarerSyncPattern(
  serviceUserId: string,
  planId: string,
  body: { slots?: VisitPlanSlotInput[] },
) {
  const res = await apiJson<ApiEnvelope<VisitPlanCarerSyncPatternPreview>>(
    `/service-users/${serviceUserId}/visit-plans/${planId}/carer-sync-pattern-preview`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function previewVisitPlanActivateImpact(serviceUserId: string, planId: string) {
  const res = await apiJson<ApiEnvelope<ActivateImpactPreview>>(
    `/service-users/${serviceUserId}/visit-plans/${planId}/activate-impact-preview`,
    { method: 'GET' },
  )
  return res.data
}

export async function previewVisitPlanGenerateSchedule(
  serviceUserId: string,
  planId: string,
  params: { fromDate: string; toDate: string; backfillDays?: number; backfillOnly?: boolean },
) {
  const qs = new URLSearchParams({
    fromDate: params.fromDate,
    toDate: params.toDate,
  })
  if (params.backfillDays != null) qs.set('backfillDays', String(params.backfillDays))
  if (params.backfillOnly === true) qs.set('backfillOnly', 'true')
  const res = await apiJson<ApiEnvelope<GenerateSchedulePreview>>(
    `/service-users/${serviceUserId}/visit-plans/${planId}/generate-schedule-preview?${qs.toString()}`,
    { method: 'GET' },
  )
  return res.data
}

export async function previewVisitPlanSkipImpact(
  serviceUserId: string,
  planId: string,
  slotId: string,
  date: string,
) {
  const qs = new URLSearchParams({ date })
  const res = await apiJson<
    ApiEnvelope<{ scheduleImpact: ScheduleImpactSummary; slotLabel: string }>
  >(
    `/service-users/${serviceUserId}/visit-plans/${planId}/slots/${slotId}/skip-impact-preview?${qs.toString()}`,
    { method: 'GET' },
  )
  return res.data
}

export async function previewAbsenceReturnImpact(
  serviceUserId: string,
  absenceId: string,
  params: { returnDate: string; daysAhead?: number },
) {
  const qs = new URLSearchParams({ returnDate: params.returnDate })
  if (params.daysAhead != null) qs.set('daysAhead', String(params.daysAhead))
  const res = await apiJson<ApiEnvelope<ReturnImpactPreview>>(
    `/service-users/${serviceUserId}/absences/${absenceId}/return-impact-preview?${qs.toString()}`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchSuspensionReviewsOverdue() {
  const res = await apiJson<ApiEnvelope<SuspensionReviewOverdueRow[]>>('/visit-plans/suspension-reviews-overdue', {
    method: 'GET',
  })
  return Array.isArray(res.data) ? res.data : []
}

export type ClearVisitPlansAndRotaCounts = {
  visitAction: number
  jobAllocation: number
  callOffVisit: number
  scheduledVisit: number
  scheduledJob: number
  scheduleRun: number
  scheduleAreaStatus: number
  scheduleBatch: number
  visitPlanAmendment: number
  visitPlanSlot: number
  serviceUserVisitPlan: number
}

export type ClearVisitPlansAndRotaResult = {
  dryRun: boolean
  counts: ClearVisitPlansAndRotaCounts
  deleted: ClearVisitPlansAndRotaCounts | null
}

/** Clears all visit plans and rota — same as prisma/scripts/clear-visit-plans-and-rota.ts */
export async function clearAllVisitPlansAndRota(dryRun: boolean): Promise<ClearVisitPlansAndRotaResult> {
  const qs = dryRun ? '?dryRun=true' : ''
  const res = await apiJson<ApiEnvelope<ClearVisitPlansAndRotaResult>>(
    `/visit-plans/dev/clear-visit-plans-and-rota${qs}`,
    { method: 'POST' },
  )
  if (!res.data) throw new Error('Invalid clear visit plans response from API')
  return res.data
}

export async function activateServiceUserVisitPlan(
  serviceUserId: string,
  planId: string,
  body?: { reactivationReason?: string; cancelEndedPlanJobs?: boolean },
) {
  const res = await apiJson<
    ApiEnvelope<ServiceUserVisitPlan> & { scheduleImpact?: ScheduleImpactSummary }
  >(`/service-users/${serviceUserId}/visit-plans/${planId}/activate`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })
  const plan = unwrapVisitPlan(res.data)
  if (!plan) throw new Error('Invalid visit plan response from API')
  return { plan, scheduleImpact: res.scheduleImpact }
}

export type EndVisitPlanPayload = {
  reason: string
  effectiveTo?: string
  retrospectiveReason?: string
  cancelFutureVisits?: boolean
}

export type SuspendVisitPlanPayload = {
  pauseReasonCatalogId: string
  reason: string
  expectedResumeAt?: string | null
  reviewDueAt?: string | null
  contingencyNotes?: string
  effectiveFrom?: string
  retrospectiveReason?: string
  cancelFutureVisits?: boolean
}

export async function suspendServiceUserVisitPlan(
  serviceUserId: string,
  planId: string,
  body: SuspendVisitPlanPayload,
) {
  const res = await apiJson<
    ApiEnvelope<ServiceUserVisitPlan> & { scheduleImpact?: { jobsCancelled: number; jobsUnallocated: number } }
  >(`/service-users/${serviceUserId}/visit-plans/${planId}/suspend`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const plan = unwrapVisitPlan(res.data)
  if (!plan) throw new Error('Invalid visit plan response from API')
  return { plan, scheduleImpact: res.scheduleImpact }
}

export async function previewVisitPlanEndScheduleImpact(
  serviceUserId: string,
  planId: string,
  params: { fromDate: string; toDate?: string },
) {
  const qs = new URLSearchParams({ fromDate: params.fromDate })
  if (params.toDate?.trim()) qs.set('toDate', params.toDate.trim())
  const res = await apiJson<ApiEnvelope<{ jobsCancelled: number; jobsUnallocated: number; jobIds: string[] }>>(
    `/service-users/${serviceUserId}/visit-plans/${planId}/end-impact-preview?${qs.toString()}`,
    { method: 'GET' },
  )
  return res.data
}

export async function previewVisitPlanSuspendScheduleImpact(
  serviceUserId: string,
  planId: string,
  params: { fromDate: string; toDate?: string },
) {
  const qs = new URLSearchParams({ fromDate: params.fromDate })
  if (params.toDate?.trim()) qs.set('toDate', params.toDate.trim())
  const res = await apiJson<ApiEnvelope<{ jobsCancelled: number; jobsUnallocated: number; jobIds: string[] }>>(
    `/service-users/${serviceUserId}/visit-plans/${planId}/suspend-impact-preview?${qs.toString()}`,
    { method: 'GET' },
  )
  return res.data
}

export async function endServiceUserVisitPlan(
  serviceUserId: string,
  planId: string,
  body: EndVisitPlanPayload,
) {
  const res = await apiJson<
    ApiEnvelope<ServiceUserVisitPlan> & { scheduleImpact?: { jobsCancelled: number; jobsUnallocated: number } }
  >(`/service-users/${serviceUserId}/visit-plans/${planId}/end`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const plan = unwrapVisitPlan(res.data)
  if (!plan) throw new Error('Invalid visit plan response from API')
  return { plan, scheduleImpact: res.scheduleImpact }
}

export async function prefillVisitPlanFromDomCare(serviceUserId: string, planId: string) {
  const res = await apiJson<ApiEnvelope<ServiceUserVisitPlan>>(
    `/service-users/${serviceUserId}/visit-plans/${planId}/prefill-dom-care`,
    { method: 'POST', body: JSON.stringify({}) },
  )
  const plan = unwrapVisitPlan(res.data)
  if (!plan) throw new Error('Invalid visit plan response from API')
  return plan
}

export async function generateScheduleFromVisitPlan(
  serviceUserId: string,
  planId: string,
  body: {
    fromDate: string
    toDate: string
    scheduleAreaId?: string | null
    backfillDays?: number
    backfillOnly?: boolean
    respectWorkingPatternOnSync?: boolean
  },
) {
  const res = await apiJson<
    ApiEnvelope<{
      visitsCreated: number
      visitsSkipped: number
      fromDate: string
      toDate: string
      backfillDays?: number
    }>
  >(
    `/service-users/${serviceUserId}/visit-plans/${planId}/generate-schedule`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export function defaultEditableSlots(rounds: MedicationRoundRow[] = []): VisitPlanSlot[] {
  return defaultEditableVisitPlanSlots(rounds)
}

export type VisitPlanCalendarVisit = {
  id: string
  visitPlanSlotId: string | null
  status: string
  displayStatus?: string
  jobStatus?: string
  requiredCarers?: number
  allocatedCount?: number
  allocatedEmployeeIds?: string[]
  attendingEmployeeId?: string | null
  slotLabel?: string | null
  slotCode?: string | null
  linkedCarePlanFormIds?: string[]
  notes: string | null
  scheduledStartDateTime: string
  scheduledEndDateTime: string | null
  actualStartDateTime?: string | null
  actualEndDateTime?: string | null
  occurrenceDate: string
}

export async function fetchVisitPlanCalendarVisits(
  serviceUserId: string,
  planId: string,
  params: { from: string; to: string },
): Promise<VisitPlanCalendarVisit[]> {
  const qs = new URLSearchParams({ from: params.from, to: params.to })
  const res = await apiJson<ApiEnvelope<VisitPlanCalendarVisit[]>>(
    `/service-users/${serviceUserId}/visit-plans/${planId}/calendar-visits?${qs}`,
    { method: 'GET' },
  )
  return Array.isArray(res.data) ? res.data : []
}

export async function recordVisitPlanCalendarOutcome(
  serviceUserId: string,
  planId: string,
  body: {
    visitPlanSlotId: string
    date: string
    status: string
    notes?: string
    employeeId?: string
    actualStartTime?: string
    actualEndTime?: string
  },
): Promise<VisitPlanCalendarVisit> {
  const res = await apiJson<ApiEnvelope<VisitPlanCalendarVisit>>(
    `/service-users/${serviceUserId}/visit-plans/${planId}/calendar-visits/record-outcome`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  if (!res.data?.id) throw new Error('Invalid visit outcome response from API')
  return res.data
}
