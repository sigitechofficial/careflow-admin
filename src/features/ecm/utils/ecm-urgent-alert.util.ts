/** Field events that ring the office and deep-link to the ECM exception queue. */
export const URGENT_OFFICE_ALERT_KINDS = [
  'CARER_SOS',
  'LEFT_VISIT_AREA',
  'UNABLE_TO_START',
] as const

export type UrgentOfficeAlertKind = (typeof URGENT_OFFICE_ALERT_KINDS)[number]

/** Action-needed flags on the ECM Exception queue tab and Schedule Jobs board. */
export const BOARD_LIVE_OFFICE_ALERT_KINDS = [
  'CARER_SOS',
  'LEFT_VISIT_AREA',
  'UNABLE_TO_START',
  'OUTSIDE_AREA_CHECK_IN_REQUEST',
] as const

export type BoardLiveOfficeAlertKind = (typeof BOARD_LIVE_OFFICE_ALERT_KINDS)[number]

export function isUrgentOfficeAlertKind(kind: unknown): boolean {
  return (
    typeof kind === 'string' &&
    (URGENT_OFFICE_ALERT_KINDS as readonly string[]).includes(kind)
  )
}

export function isClosedEcmExceptionLifecycle(lifecycle: string): boolean {
  return (
    lifecycle === 'RESOLVED' ||
    lifecycle === 'MANAGER_REVIEWED' ||
    lifecycle === 'CLOSED'
  )
}

/** Minimal exception shape shared by ECM tab counts and the schedule-jobs board. */
export type LiveOfficeAlertException = {
  id?: string
  scheduledJobId: string
  kind: string
  lifecycle: string
  acknowledgedAt?: string | null
  plannedDate?: string | null
  createdAt?: string | null
  clockedInAt?: string | null
  title?: string | null
  detail?: string | null
  sos?: {
    acknowledgedAt?: string | null
    createdAt?: string | null
    message?: string | null
    employeeName?: string | null
    employeeId?: string | null
    latitude?: number | null
    longitude?: number | null
    locationUnavailable?: boolean
  } | null
  areaLock?: {
    status?: string | null
    latitude?: number | null
    longitude?: number | null
  } | null
  checkInMethodRequest?: {
    id?: string
    status?: string | null
    carerNote?: string | null
    latitude?: number | null
    longitude?: number | null
    locationUnavailable?: boolean
  } | null
  checkInLocation?: {
    latitude?: number | null
    longitude?: number | null
  } | null
}

export function isLiveCarerSos(row: LiveOfficeAlertException): boolean {
  return (
    row.kind === 'CARER_SOS' &&
    !isClosedEcmExceptionLifecycle(row.lifecycle) &&
    row.lifecycle !== 'ACKNOWLEDGED' &&
    !row.acknowledgedAt &&
    !row.sos?.acknowledgedAt
  )
}

/** Immediate cache patch so Schedule Jobs does not keep a stale unacked SOS. */
export function markLiveOfficeAlertAcknowledged<T extends LiveOfficeAlertException>(
  rows: T[],
  id: string,
  at: string,
): T[] {
  return rows.map((row) => {
    if (row.id !== id) return row
    return {
      ...row,
      lifecycle: 'ACKNOWLEDGED',
      acknowledgedAt: row.acknowledgedAt ?? at,
      sos: row.sos
        ? { ...row.sos, acknowledgedAt: row.sos.acknowledgedAt ?? at }
        : row.sos,
    }
  })
}

export function markLeftVisitAreaAllowed<T extends LiveOfficeAlertException>(
  rows: T[],
  jobId: string,
): T[] {
  return rows.map((row) => {
    if (row.scheduledJobId !== jobId || row.kind !== 'LEFT_VISIT_AREA') return row
    return {
      ...row,
      areaLock: { ...row.areaLock, status: 'ALLOWED' },
    }
  })
}

export function markCheckInRequestDecided<T extends LiveOfficeAlertException>(
  rows: T[],
  jobId: string,
  status: 'AUTHORISED' | 'REJECTED',
): T[] {
  return rows.map((row) => {
    if (row.scheduledJobId !== jobId || row.kind !== 'OUTSIDE_AREA_CHECK_IN_REQUEST') return row
    return {
      ...row,
      checkInMethodRequest: { ...row.checkInMethodRequest, status },
    }
  })
}

export function markLiveOfficeAlertClosed<T extends LiveOfficeAlertException>(
  rows: T[],
  id: string,
): T[] {
  return rows.map((row) => {
    if (row.id !== id) return row
    return { ...row, lifecycle: 'CLOSED' }
  })
}

export function isLiveLeftVisitArea(row: LiveOfficeAlertException): boolean {
  return row.kind === 'LEFT_VISIT_AREA' && row.areaLock?.status !== 'ALLOWED'
}

export function isLiveUnableToStart(row: LiveOfficeAlertException): boolean {
  return row.kind === 'UNABLE_TO_START' && !isClosedEcmExceptionLifecycle(row.lifecycle)
}

export function isLiveOutsideAreaCheckIn(row: LiveOfficeAlertException): boolean {
  return (
    row.kind === 'OUTSIDE_AREA_CHECK_IN_REQUEST' &&
    (row.checkInMethodRequest?.status ?? 'PENDING') === 'PENDING' &&
    !isClosedEcmExceptionLifecycle(row.lifecycle)
  )
}

export function liveOfficeAlertKindForRow(
  row: LiveOfficeAlertException,
): BoardLiveOfficeAlertKind | null {
  if (isLiveCarerSos(row)) return 'CARER_SOS'
  if (isLiveLeftVisitArea(row)) return 'LEFT_VISIT_AREA'
  if (isLiveUnableToStart(row)) return 'UNABLE_TO_START'
  if (isLiveOutsideAreaCheckIn(row)) return 'OUTSIDE_AREA_CHECK_IN_REQUEST'
  return null
}

export type ExceptionQueueTabFlags = {
  sosVisitCount: number
  lockedAreaVisitCount: number
  checkInRequestVisitCount: number
  unableToStartVisitCount: number
}

export function countExceptionQueueTabFlags(
  rows: LiveOfficeAlertException[],
): ExceptionQueueTabFlags {
  const sosJobs = new Set<string>()
  const lockedAreaJobs = new Set<string>()
  const checkInRequestJobs = new Set<string>()
  const unableToStartJobs = new Set<string>()
  for (const row of rows) {
    if (isLiveCarerSos(row)) sosJobs.add(row.scheduledJobId)
    if (isLiveLeftVisitArea(row)) lockedAreaJobs.add(row.scheduledJobId)
    if (isLiveOutsideAreaCheckIn(row)) checkInRequestJobs.add(row.scheduledJobId)
    if (isLiveUnableToStart(row)) unableToStartJobs.add(row.scheduledJobId)
  }
  return {
    sosVisitCount: sosJobs.size,
    lockedAreaVisitCount: lockedAreaJobs.size,
    checkInRequestVisitCount: checkInRequestJobs.size,
    unableToStartVisitCount: unableToStartJobs.size,
  }
}
