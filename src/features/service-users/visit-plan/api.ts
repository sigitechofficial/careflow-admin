import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { ServiceUserVisitPlan, VisitPlanSlot, VisitPlanSlotCode } from '@/features/service-users/visit-plan/types'

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
}

function normalizeSlot(slot: VisitPlanSlot): VisitPlanSlot {
  return {
    ...SLOT_OPTION_DEFAULTS,
    ...slot,
    daysOfWeek: Array.isArray(slot.daysOfWeek) ? slot.daysOfWeek : [],
  }
}

function normalizeVisitPlan(plan: ServiceUserVisitPlan): ServiceUserVisitPlan {
  return {
    ...plan,
    slots: Array.isArray(plan.slots) ? plan.slots.map(normalizeSlot) : [],
    amendments: Array.isArray(plan.amendments) ? plan.amendments : [],
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

export async function createServiceUserVisitPlan(
  serviceUserId: string,
  body: {
    weeklyContractedHours?: string | null
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
  },
) {
  const res = await apiJson<ApiEnvelope<ServiceUserVisitPlan>>(
    `/service-users/${serviceUserId}/visit-plans/${planId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  const plan = unwrapVisitPlan(res.data)
  if (!plan) throw new Error('Invalid visit plan response from API')
  return plan
}

export async function activateServiceUserVisitPlan(serviceUserId: string, planId: string) {
  const res = await apiJson<ApiEnvelope<ServiceUserVisitPlan>>(
    `/service-users/${serviceUserId}/visit-plans/${planId}/activate`,
    { method: 'POST', body: JSON.stringify({}) },
  )
  const plan = unwrapVisitPlan(res.data)
  if (!plan) throw new Error('Invalid visit plan response from API')
  return plan
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
  body: { fromDate: string; toDate: string; scheduleAreaId?: string | null },
) {
  const res = await apiJson<ApiEnvelope<{ visitsCreated: number; visitsSkipped: number; fromDate: string; toDate: string }>>(
    `/service-users/${serviceUserId}/visit-plans/${planId}/generate-schedule`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export function defaultEditableSlots(): VisitPlanSlot[] {
  const codes: VisitPlanSlotCode[] = ['MORNING', 'LUNCH', 'TEA', 'EVENING', 'NIGHT']
  const defaults: Record<VisitPlanSlotCode, { start: string; end: string }> = {
    MORNING: { start: '06:00', end: '10:59' },
    LUNCH: { start: '11:00', end: '14:59' },
    TEA: { start: '15:00', end: '17:59' },
    EVENING: { start: '18:00', end: '20:55' },
    NIGHT: { start: '21:00', end: '07:00' },
  }
  return codes.map((slotCode, index) => ({
    slotCode,
    label: slotCode.charAt(0) + slotCode.slice(1).toLowerCase(),
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    plannedStartTime: defaults[slotCode].start,
    plannedEndTime: defaults[slotCode].end,
    requiredCarers: 1,
    isEnabled: false,
    medicationRoundCode: null,
    notes: '',
    sortOrder: index,
    ...SLOT_OPTION_DEFAULTS,
  }))
}
