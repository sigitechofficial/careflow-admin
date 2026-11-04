import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type TimebankWeekStatus = 'complete' | 'short' | 'current' | 'upcoming'

export type TimebankOption = { id: string; name: string }

export type TimebankServiceUserRef = {
  id: string
  name: string
  serviceUserNumber: string | null
  location: TimebankOption | null
  fundingType: TimebankOption | null
  weeklyHours: number | null
}

/** Why a week is short: visits missed, shorter, cancelled, and contracted hours with no visit on the rota. */
export type TimebankWeekReasons = {
  cancelledByServiceUserMinutes: number
  cancelledByAgencyMinutes: number
  cancelledOtherMinutes: number
  missedMinutes: number
  shorterMinutes: number
  longerMinutes: number
  notBookedMinutes: number
}

/** A visit clocked into but never clocked out (the office closes it). */
export type TimebankAwaitingVisit = {
  jobId: string
  jobName: string
  day: string
  start: string
  end: string | null
  plannedMinutes: number
}

export type TimebankListRow = TimebankServiceUserRef & {
  weekStatus: TimebankWeekStatus
  setMinutes: number
  createdMinutes: number
  deliveredMinutes: number
  pendingMinutes: number
  scheduledMinutes: number
  /** Clocked in, no clock-out yet: not delivered and not short until the office closes the visit. */
  awaitingMinutes: number
  awaitingVisits: number
  awaitingVisitList: TimebankAwaitingVisit[]
  freeMinutes: number
  /** Visits came to more than the weekly hours (delivered, not approved, awaiting and scheduled). */
  overMinutes: number
  pendingVisits: number
  reasons: TimebankWeekReasons
  balanceMinutes: number
}

export type TimebankList = {
  weekStart: string
  weekEnd: string
  currentWeekStart: string
  isCurrentWeek: boolean
  rows: TimebankListRow[]
  facets: { locations: TimebankOption[]; fundingTypes: TimebankOption[] }
}

export type TimebankShortReason =
  | 'CANCELLED_BY_SERVICE_USER'
  | 'CANCELLED_BY_AGENCY'
  | 'CANCELLED_OTHER'
  | 'MISSED'
  | 'CALLED_OFF'
  | 'SHORTER'
  | 'NOT_APPROVED'

export type TimebankShortVisit = {
  jobId: string
  jobName: string
  day: string
  start: string
  end: string | null
  plannedMinutes: number
  deliveredMinutes: number
  pendingMinutes: number
  shortMinutes: number
  reason: TimebankShortReason
  cancelReasonCode: string | null
  /** Free text typed with the cancellation (e.g. for "Other"). */
  cancelReasonNotes: string | null
}

/** What happened to one rota visit of the week. */
export type TimebankVisitOutcome =
  | TimebankShortReason
  | 'DELIVERED'
  | 'PENDING'
  | 'SCHEDULED'
  | 'UNABLE_TO_START'
  | 'AWAITING_CLOCK_OUT'
  | 'REMOVED_HOURS_REDUCED'

export type TimebankWeekVisit = Omit<TimebankShortVisit, 'reason'> & {
  outcome: TimebankVisitOutcome
  /** "Unable to start" reason and notes, when the carer attended but care was not delivered. */
  careNotDelivered: { reasonCode: string | null; notes: string | null } | null
}

export type TimebankWeek = {
  weekStart: string
  weekEnd: string
  status: TimebankWeekStatus
  setMinutes: number
  weeklyHours: number | null
  createdMinutes: number
  deliveredMinutes: number
  invoicedMinutes: number
  pendingMinutes: number
  scheduledMinutes: number
  awaitingMinutes: number
  freeMinutes: number
  overMinutes: number
  addedToBankMinutes: number
  balanceMinutes: number
  visits: {
    created: number
    delivered: number
    pending: number
    scheduled: number
    awaiting: number
    cancelled: number
    missed: number
  }
  reasons: TimebankWeekReasons
  /** Every rota visit of the week, cancelled ones included, in time order. */
  allVisits: TimebankWeekVisit[]
}

export type TimebankDetail = {
  serviceUser: TimebankServiceUserRef
  startDate: string
  currentWeekStart: string
  totals: {
    weeks: number
    setMinutes: number
    deliveredMinutes: number
    invoicedMinutes: number
    pendingMinutes: number
    bankMinutes: number
    /** Contracted / delivered / not checked include this (started) week; the bank doesn't. */
    includesCurrentWeek: boolean
    thisWeek: {
      weekStart: string
      weekEnd: string
      scheduledMinutes: number
      scheduledVisits: number
      freeMinutes: number
    } | null
  }
  selectedWeek: (TimebankWeek & { shortVisits: TimebankShortVisit[] }) | null
  /** Every visit not fully delivered, newest first, with its week. */
  shortVisits: Array<TimebankShortVisit & { weekStart: string }>
  /** Newest first. */
  weeks: TimebankWeek[]
  /** Hours taken from the bank for visits over the weekly hours, and given back. */
  timebank: TimebankLedger
}

export type TimebankEntryReason =
  | 'NEW_VISIT'
  | 'LONGER_VISIT'
  | 'VISIT_CANCELLED'
  | 'VISIT_REMOVED'
  | 'WEEK_NEEDED_LESS'
  | 'NOT_DELIVERED'

export type TimebankLedgerEntry = {
  id: string
  kind: 'RESERVED' | 'RETURNED'
  minutes: number
  reason: TimebankEntryReason | string
  note: string | null
  weekStart: string
  createdAt: string
  createdBy: { id: string; firstName: string | null; lastName: string | null } | null
  scheduledJob: {
    id: string
    jobName: string
    scheduledStartDateTime: string
    scheduledEndDateTime: string | null
    status: string
  } | null
}

export type TimebankBalance = {
  /** Settings → Dom Rules "Use timebank hours automatically". */
  useTimebank: boolean
  /** Finished weeks that got fewer hours than set. */
  earnedMinutes: number
  /** Held by visits over the weekly hours. */
  reservedMinutes: number
  availableMinutes: number
}

export type TimebankLedger = TimebankBalance & { entries: TimebankLedgerEntry[] }

export type JobTimebank = {
  /** Minutes the visit still holds from the bank. */
  heldMinutes: number
  entries: Array<Pick<TimebankLedgerEntry, 'id' | 'kind' | 'minutes' | 'reason' | 'note' | 'createdAt'>>
}

export async function fetchTimebankBalance(serviceUserId: string): Promise<TimebankBalance> {
  const res = await apiJson<ApiEnvelope<TimebankBalance>>(
    `/service-user-hours/timebank/${encodeURIComponent(serviceUserId)}/balance`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchJobTimebank(scheduledJobId: string): Promise<JobTimebank> {
  const res = await apiJson<ApiEnvelope<JobTimebank>>(
    `/service-user-hours/timebank/jobs/${encodeURIComponent(scheduledJobId)}`,
    { method: 'GET' },
  )
  return res.data
}

export type TimebankListParams = {
  weekStart?: string
  locationId?: string
  fundingTypeId?: string
  search?: string
}

export async function fetchTimebankList(params: TimebankListParams): Promise<TimebankList> {
  const qs = new URLSearchParams()
  if (params.weekStart) qs.set('weekStart', params.weekStart)
  if (params.locationId) qs.set('locationId', params.locationId)
  if (params.fundingTypeId) qs.set('fundingTypeId', params.fundingTypeId)
  if (params.search?.trim()) qs.set('search', params.search.trim())
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<TimebankList>>(`/service-user-hours/timebank${suffix}`, {
    method: 'GET',
  })
  return res.data
}

export async function fetchTimebankDetail(serviceUserId: string, weekStart?: string): Promise<TimebankDetail> {
  const suffix = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : ''
  const res = await apiJson<ApiEnvelope<TimebankDetail>>(
    `/service-user-hours/timebank/${encodeURIComponent(serviceUserId)}${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

/* ── Carers ─────────────────────────────────────────────────────────── */

export type CarerTimebankRef = {
  id: string
  name: string
  employeeNumber: string | null
  location: TimebankOption | null
  weeklyHours: number | null
}

export type CarerTimebankListRow = CarerTimebankRef & {
  weekStatus: TimebankWeekStatus
  contractedMinutes: number
  absenceMinutes: number
  setMinutes: number
  assignedMinutes: number
  workedMinutes: number
  pendingMinutes: number
  scheduledMinutes: number
  cancelledMinutes: number
  notGivenMinutes: number
  notWorkedMinutes: number
  freeMinutes: number
  balanceMinutes: number
}

export type CarerTimebankList = {
  weekStart: string
  weekEnd: string
  currentWeekStart: string
  isCurrentWeek: boolean
  rows: CarerTimebankListRow[]
  facets: { locations: TimebankOption[] }
}

export type CarerTimebankOutcome =
  | 'WORKED'
  | 'PENDING'
  | 'SCHEDULED'
  | 'SHORTER'
  | 'MISSED'
  | 'PAY_REJECTED'
  | 'UNABLE_TO_START'
  | 'CANCELLED_BY_SERVICE_USER'
  | 'CANCELLED_BY_AGENCY'
  | 'CANCELLED_OTHER'
  | 'CALLED_OFF'

export type CarerTimebankVisit = {
  jobId: string
  jobName: string
  serviceUserName: string
  day: string
  start: string
  end: string | null
  plannedMinutes: number
  workedMinutes: number
  pendingMinutes: number
  shortMinutes: number
  outcome: CarerTimebankOutcome
  /** Cancellation or "Unable to start" reason code, and the note typed with it. */
  reasonCode: string | null
  reasonNotes: string | null
}

export type CarerTimebankWeek = {
  weekStart: string
  weekEnd: string
  status: TimebankWeekStatus
  weeklyHours: number | null
  contractedMinutes: number
  absentDays: number
  absenceMinutes: number
  setMinutes: number
  assignedMinutes: number
  workedMinutes: number
  pendingMinutes: number
  scheduledMinutes: number
  cancelledMinutes: number
  notGivenMinutes: number
  notWorkedMinutes: number
  freeMinutes: number
  overMinutes: number
  addedToBankMinutes: number
  balanceMinutes: number
  absences: Array<{ from: string; to: string; type: string; sickness: boolean }>
  allVisits: CarerTimebankVisit[]
}

export type CarerTimebankDetail = {
  carer: CarerTimebankRef
  startDate: string
  currentWeekStart: string
  totals: {
    weeks: number
    includesCurrentWeek: boolean
    contractedMinutes: number
    absenceMinutes: number
    setMinutes: number
    assignedMinutes: number
    workedMinutes: number
    pendingMinutes: number
    notGivenMinutes: number
    notWorkedMinutes: number
    cancelledMinutes: number
    bankMinutes: number
    thisWeek: {
      weekStart: string
      weekEnd: string
      scheduledMinutes: number
      scheduledVisits: number
      freeMinutes: number
    } | null
  }
  /** Every visit not fully worked, newest first, with its week. */
  shortVisits: Array<CarerTimebankVisit & { weekStart: string }>
  /** Newest first. */
  weeks: CarerTimebankWeek[]
}

export type CarerTimebankListParams = {
  weekStart?: string
  locationId?: string
  search?: string
}

export async function fetchCarerTimebankList(params: CarerTimebankListParams): Promise<CarerTimebankList> {
  const qs = new URLSearchParams()
  if (params.weekStart) qs.set('weekStart', params.weekStart)
  if (params.locationId) qs.set('locationId', params.locationId)
  if (params.search?.trim()) qs.set('search', params.search.trim())
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<CarerTimebankList>>(`/employee-hours/timebank${suffix}`, { method: 'GET' })
  return res.data
}

export async function fetchCarerTimebankDetail(employeeId: string): Promise<CarerTimebankDetail> {
  const res = await apiJson<ApiEnvelope<CarerTimebankDetail>>(
    `/employee-hours/timebank/${encodeURIComponent(employeeId)}`,
    { method: 'GET' },
  )
  return res.data
}
