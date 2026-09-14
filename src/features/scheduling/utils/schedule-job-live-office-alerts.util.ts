import {
  liveOfficeAlertKindForRow,
  type BoardLiveOfficeAlertKind,
  type LiveOfficeAlertException,
} from '@/features/ecm/utils/ecm-urgent-alert.util'

export const LIVE_OFFICE_ALERT_PRIORITY: Record<BoardLiveOfficeAlertKind, number> = {
  CARER_SOS: 0,
  LEFT_VISIT_AREA: 1,
  UNABLE_TO_START: 2,
  OUTSIDE_AREA_CHECK_IN_REQUEST: 3,
}

export type LiveOfficeAlert = {
  kind: BoardLiveOfficeAlertKind
  shortLabel: string
  label: string
  /** Compact status on the Gantt card (e.g. Needs allow). */
  hint?: string | null
  chipClass: string
  pulseClass: string
  sentAt?: string | null
  employeeId?: string | null
  employeeFirstName?: string | null
  hasGps?: boolean
  message?: string | null
}

const META: Record<
  BoardLiveOfficeAlertKind,
  Pick<LiveOfficeAlert, 'shortLabel' | 'label' | 'hint' | 'chipClass' | 'pulseClass'>
> = {
  CARER_SOS: {
    shortLabel: 'SOS',
    label: 'Carer SOS',
    chipClass: 'bg-red-600 text-white shadow-sm',
    pulseClass:
      'z-[30] origin-center overflow-visible border-2 border-red-500 bg-rose-50 text-rose-950 dark:bg-rose-950/80 dark:text-rose-50 schedule-job-live-alert-danger',
  },
  LEFT_VISIT_AREA: {
    shortLabel: 'Left area',
    label: 'Left visit area',
    hint: 'Ops paused',
    chipClass: 'bg-red-600 text-white shadow-sm',
    pulseClass:
      'z-[30] origin-center overflow-visible border-2 border-red-500 bg-rose-50 text-rose-950 dark:bg-rose-950/80 dark:text-rose-50 schedule-job-live-alert-danger',
  },
  UNABLE_TO_START: {
    shortLabel: 'Unable to start',
    label: 'Unable to start',
    chipClass: 'bg-amber-600 text-white shadow-sm',
    pulseClass:
      'z-[30] origin-center overflow-visible border-2 border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/80 dark:text-amber-50 schedule-job-live-alert-warn',
  },
  OUTSIDE_AREA_CHECK_IN_REQUEST: {
    shortLabel: 'Auth request',
    label: 'Manual authorisation request',
    hint: 'Needs allow',
    chipClass: 'bg-amber-600 text-white shadow-sm',
    pulseClass:
      'z-[30] origin-center overflow-visible border-2 border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950/80 dark:text-amber-50 schedule-job-live-alert-warn',
  },
}

export function liveOfficeAlertForKind(kind: BoardLiveOfficeAlertKind): LiveOfficeAlert {
  return { kind, ...META[kind] }
}

export function liveOfficeAlertChipText(alert: LiveOfficeAlert): string {
  return liveOfficeAlertChipIsSentence(alert) ? alert.label : alert.shortLabel
}

export function liveOfficeAlertChipIsSentence(alert: LiveOfficeAlert): boolean {
  return (
    alert.kind === 'OUTSIDE_AREA_CHECK_IN_REQUEST' ||
    alert.kind === 'UNABLE_TO_START' ||
    alert.kind === 'LEFT_VISIT_AREA'
  )
}

const UNABLE_TO_START_TITLE_PREFIXES = [
  'Unable to start — ',
  'Unable to start – ',
  'Unable to start - ',
] as const

export function unableToStartReasonFromException(
  row: LiveOfficeAlertException,
): string | null {
  const title = row.title?.trim() ?? ''
  for (const prefix of UNABLE_TO_START_TITLE_PREFIXES) {
    if (title.startsWith(prefix)) {
      const reason = title.slice(prefix.length).trim()
      if (reason) return reason
    }
  }
  const detail = row.detail?.trim()
  return detail || null
}

export function sortLiveOfficeAlerts(alerts: LiveOfficeAlert[]): LiveOfficeAlert[] {
  return [...alerts].sort(
    (a, b) => LIVE_OFFICE_ALERT_PRIORITY[a.kind] - LIVE_OFFICE_ALERT_PRIORITY[b.kind],
  )
}

export function highestPriorityLiveOfficeAlert(
  alerts: LiveOfficeAlert[] | undefined,
): LiveOfficeAlert | null {
  if (!alerts?.length) return null
  return sortLiveOfficeAlerts(alerts)[0] ?? null
}

export function liveOfficeAlertKey(alerts: LiveOfficeAlert[] | undefined): string {
  return (alerts ?? [])
    .map(
      (alert) =>
        `${alert.kind}:${alert.sentAt ?? ''}:${alert.hasGps ? 1 : 0}:${alert.employeeId ?? ''}:${alert.hint ?? ''}:${alert.message ?? ''}`,
    )
    .join('|')
}

function rowOccurredAt(row: LiveOfficeAlertException): number {
  const iso = row.sos?.createdAt ?? row.createdAt
  const stamp = iso ? Date.parse(iso) : 0
  return Number.isFinite(stamp) ? stamp : 0
}

function hasFiniteCoord(latitude?: number | null, longitude?: number | null): boolean {
  return latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)
}

export function liveOfficeAlertHasGps(
  kind: BoardLiveOfficeAlertKind,
  row: LiveOfficeAlertException,
): boolean {
  if (kind === 'CARER_SOS') {
    if (row.sos?.locationUnavailable) return false
    return hasFiniteCoord(row.sos?.latitude, row.sos?.longitude)
  }
  if (kind === 'LEFT_VISIT_AREA') {
    return hasFiniteCoord(row.areaLock?.latitude, row.areaLock?.longitude)
  }
  if (kind === 'OUTSIDE_AREA_CHECK_IN_REQUEST') {
    if (row.checkInMethodRequest?.locationUnavailable) return false
    return (
      hasFiniteCoord(row.checkInMethodRequest?.latitude, row.checkInMethodRequest?.longitude) ||
      hasFiniteCoord(row.checkInLocation?.latitude, row.checkInLocation?.longitude)
    )
  }
  return hasFiniteCoord(row.checkInLocation?.latitude, row.checkInLocation?.longitude)
}

function firstName(name?: string | null): string | null {
  const trimmed = name?.trim()
  if (!trimmed) return null
  return trimmed.split(/\s+/)[0] ?? trimmed
}

function liveOfficeAlertFromRow(
  kind: BoardLiveOfficeAlertKind,
  row: LiveOfficeAlertException,
): LiveOfficeAlert {
  const base = liveOfficeAlertForKind(kind)
  const reason = kind === 'UNABLE_TO_START' ? unableToStartReasonFromException(row) : null
  const notes = row.detail?.trim() || null
  const unableNotes = reason && notes && notes !== reason ? notes : !reason ? notes : null
  return {
    ...base,
    hint: reason ?? base.hint,
    sentAt: row.sos?.createdAt ?? row.createdAt ?? null,
    employeeId: row.sos?.employeeId ?? null,
    employeeFirstName: firstName(row.sos?.employeeName),
    hasGps: liveOfficeAlertHasGps(kind, row),
    message:
      row.sos?.message?.trim() ||
      row.checkInMethodRequest?.carerNote?.trim() ||
      unableNotes ||
      null,
  }
}

export function groupLiveOfficeAlertsByJobId(
  rows: LiveOfficeAlertException[],
  options: { date: string; jobIds?: ReadonlySet<string> },
): Map<string, LiveOfficeAlert[]> {
  const bestByJob = new Map<string, Map<BoardLiveOfficeAlertKind, LiveOfficeAlertException>>()
  for (const row of rows) {
    if (row.plannedDate && row.plannedDate !== options.date) continue
    if (options.jobIds && !options.jobIds.has(row.scheduledJobId)) continue
    const kind = liveOfficeAlertKindForRow(row)
    if (!kind) continue
    const byKind = bestByJob.get(row.scheduledJobId) ?? new Map<BoardLiveOfficeAlertKind, LiveOfficeAlertException>()
    const existing = byKind.get(kind)
    if (!existing || rowOccurredAt(row) >= rowOccurredAt(existing)) {
      byKind.set(kind, row)
    }
    bestByJob.set(row.scheduledJobId, byKind)
  }
  const out = new Map<string, LiveOfficeAlert[]>()
  for (const [jobId, byKind] of bestByJob) {
    out.set(
      jobId,
      sortLiveOfficeAlerts(
        [...byKind.entries()].map(([kind, row]) => liveOfficeAlertFromRow(kind, row)),
      ),
    )
  }
  return out
}

export type LiveOfficeAlertCardFit = {
  showSentTime: boolean
  showMeta: boolean
  showSender: boolean
  showMessage: boolean
}

/** Progressive disclosure so a narrow Gantt block never overflows. */
export function liveOfficeAlertCardFit(
  widthPx: number,
  stackedLanes: boolean,
): LiveOfficeAlertCardFit {
  if (stackedLanes || widthPx < 92) {
    return { showSentTime: false, showMeta: false, showSender: false, showMessage: false }
  }
  return {
    showSentTime: widthPx >= 104,
    showMeta: widthPx >= 118,
    showSender: widthPx >= 168,
    showMessage: widthPx >= 176,
  }
}

export type LiveOfficeAlertBoardCounts = {
  sos: number
  leftArea: number
  unableToStart: number
  checkIn: number
  visitCount: number
  firstJobIdByKind: Partial<Record<BoardLiveOfficeAlertKind, string>>
}

export function countLiveOfficeAlertsOnBoard(
  byJobId: Map<string, LiveOfficeAlert[]>,
): LiveOfficeAlertBoardCounts {
  const firstJobIdByKind: Partial<Record<BoardLiveOfficeAlertKind, string>> = {}
  let sos = 0
  let leftArea = 0
  let unableToStart = 0
  let checkIn = 0
  for (const [jobId, alerts] of byJobId) {
    for (const alert of alerts) {
      if (firstJobIdByKind[alert.kind] == null) firstJobIdByKind[alert.kind] = jobId
      if (alert.kind === 'CARER_SOS') sos += 1
      else if (alert.kind === 'LEFT_VISIT_AREA') leftArea += 1
      else if (alert.kind === 'UNABLE_TO_START') unableToStart += 1
      else checkIn += 1
    }
  }
  return {
    sos,
    leftArea,
    unableToStart,
    checkIn,
    visitCount: byJobId.size,
    firstJobIdByKind,
  }
}
