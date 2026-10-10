import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { addDaysToOperationalIso, combineOperationalDateAndHm } from '@/shared/lib/operational-day.util'

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type DoseStatus = 'GIVEN' | 'MISSED' | 'REFUSED' | 'NOT_GIVEN' | 'HELD'
export type DoseExceptionStatus = Exclude<DoseStatus, 'GIVEN'>
export type StockMovementType = 'ADDED' | 'USED' | 'ADJUSTED' | 'WASTED'

/** API: GET /dashboard/medication-overview — the Medication module dashboard. */
export type MedicationOverview = {
  period: { from: string; to: string; days: number }
  today: { recorded: number; exceptions: number; byStatus: Record<DoseStatus, number> }
  doses: {
    recorded: number
    exceptions: number
    byStatus: Record<DoseStatus, number>
    givenPct: number | null
    timed: number
    onTime: number
    late: number
    early: number
    onTimePct: number | null
    timeCriticalLate: number
    prnGiven: number
    controlledGiven: number
    controlledWithoutWitness: number
    awaitingReview: number
  }
  medicines: {
    active: number
    regular: number
    prn: number
    serviceUsersOnMedication: number
    controlled: number
    timeCritical: number
    endingSoon: number
    expired: number
  }
  /** One level per service user on medication: support profile first, else Initial Assessment §9.2. */
  support: {
    recorded: number
    notRecorded: number
    fromProfile: number
    fromAssessment: number
    selfAdministers: number
    prompt: number
    assist: number
    carerAdministers: number
    othersProvide: number
  }
  /** Profile allergies and medication allergies combined. */
  allergies: { serviceUsersWithAllergies: number; onMedicationWithAllergies: number }
  reviews: { overdue: number; dueSoon: number; neverReviewed: number }
  packs: {
    active: number
    draft: number
    reviewDue: number
    prescriptionNotChecked: number
    deliveriesAwaitingCountersign: number
    deliveriesFlagged: number
    deliveriesDamaged: number
  }
  stock: Record<StockMovementType, number>
}

/** API: GET /dashboard/medication-exceptions (with list filters). */
export type DoseException = {
  id: string
  status: DoseExceptionStatus
  serviceUserId: string
  serviceUserName: string
  medicationName: string
  dueAt: string | null
  reason: string | null
  notes: string | null
  timeCritical: boolean
  controlled: boolean
  reviewed: boolean
  reviewedAt: string | null
  reviewNotes: string | null
}
export type DoseExceptionList = {
  dateFrom: string
  dateTo: string
  total: number
  awaitingReview: number
  byStatus: Record<DoseExceptionStatus, number>
  items: DoseException[]
}

type PersonRef = { personalDetail?: { firstName?: string | null; lastName?: string | null } | null } | null
type ServiceUserRef = { id: string; firstName?: string | null; lastName?: string | null } | null

/** API: GET /medication-reports/administered and /late-administrations rows. */
export type AdministeredDose = {
  id: string
  serviceUserId: string
  scheduledDateTime: string | null
  actualDateTime: string | null
  doseGiven: string | null
  doseSnapshot: string | null
  medicationNameSnapshot: string | null
  isPrn: boolean
  prnReason: string | null
  supportLevel: string | null
  witnessPresent: boolean | null
  witnessName: string | null
  notes: string | null
  delayMinutes?: number
  medication?: { medicationName: string; isControlledMedication?: boolean; timeCritical?: boolean; category?: { name?: string } | null } | null
  administeredBy?: PersonRef
  serviceUser?: ServiceUserRef
}

/** API: GET /medication-reports/stock-levels rows. */
export type StockMovement = {
  id: string
  quantity: string | null
  unit: string | null
  movementType: StockMovementType
  movementDate: string
  notes: string | null
  medication?: { medicationName: string; serviceUserId: string } | null
  recordedBy?: PersonRef
}

export type Paged<T> = { rows: T[]; total: number; page: number; limit: number }

/* ─── Fetchers ───────────────────────────────────────────────────────────── */

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** The reports API takes ISO date-times; cover whole days in the organisation's timezone. */
function dayRange(dateFrom: string, dateTo: string) {
  const start = combineOperationalDateAndHm(dateFrom, '00:00')
  const nextDay = combineOperationalDateAndHm(addDaysToOperationalIso(dateTo, 1), '00:00')
  return {
    dateFrom: start,
    dateTo: new Date(Date.parse(nextDay) - 1).toISOString(),
  }
}

export async function fetchMedicationOverview(
  params: { days?: number; locationId?: string | null },
  signal?: AbortSignal,
): Promise<MedicationOverview> {
  const res = await apiJson<ApiEnvelope<MedicationOverview>>(`/dashboard/medication-overview${qs(params)}`, {
    method: 'GET',
    signal,
  })
  return res.data
}

export async function fetchDoseExceptions(
  params: {
    dateFrom: string
    dateTo: string
    locationId?: string | null
    status?: DoseExceptionStatus
    unreviewedOnly?: boolean
    limit?: number
  },
  signal?: AbortSignal,
): Promise<DoseExceptionList> {
  const res = await apiJson<ApiEnvelope<DoseExceptionList>>(`/dashboard/medication-exceptions${qs(params)}`, {
    method: 'GET',
    signal,
  })
  return res.data
}

export async function fetchDoseReport(
  kind: 'administered' | 'late-administrations',
  params: { dateFrom: string; dateTo: string; page: number; limit: number },
  signal?: AbortSignal,
): Promise<Paged<AdministeredDose>> {
  const res = await apiJson<ApiEnvelope<AdministeredDose[]>>(
    `/medication-reports/${kind}${qs({ ...dayRange(params.dateFrom, params.dateTo), allServiceUsers: true, page: params.page, limit: params.limit })}`,
    { method: 'GET', signal },
  )
  const meta = (res.meta ?? {}) as { total?: number }
  return { rows: res.data ?? [], total: meta.total ?? res.data?.length ?? 0, page: params.page, limit: params.limit }
}

export async function fetchStockMovements(
  params: { dateFrom: string; dateTo: string },
  signal?: AbortSignal,
): Promise<StockMovement[]> {
  const res = await apiJson<ApiEnvelope<StockMovement[]>>(
    `/medication-reports/stock-levels${qs({ ...dayRange(params.dateFrom, params.dateTo), allServiceUsers: true, limit: 200 })}`,
    { method: 'GET', signal },
  )
  return res.data ?? []
}

export async function reviewDose(serviceUserId: string, eventId: string, notes?: string): Promise<void> {
  await apiJson(`/service-users/${serviceUserId}/medication-events/${eventId}/review`, {
    method: 'POST',
    body: JSON.stringify(notes?.trim() ? { notes: notes.trim() } : {}),
  })
}
