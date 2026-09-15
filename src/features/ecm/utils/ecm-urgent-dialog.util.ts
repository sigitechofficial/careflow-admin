import {
  isUrgentOfficeDialogKind,
  type UrgentOfficeDialogKind,
} from '@/features/ecm/utils/ecm-urgent-alert.util'

export type UrgentOfficeDialogAlert = {
  exceptionId: string
  scheduledJobId: string
  kind: UrgentOfficeDialogKind
  title: string
  message: string
  createdAt: string
}

export type UrgentOfficeDialogVisit = {
  scheduledJobId: string
  alerts: UrgentOfficeDialogAlert[]
  deferred: boolean
}

export type UrgentOfficeDialogState = {
  visits: UrgentOfficeDialogVisit[]
  activeJobId: string | null
  pickerOpen: boolean
}

export const emptyUrgentOfficeDialogState = (): UrgentOfficeDialogState => ({
  visits: [],
  activeJobId: null,
  pickerOpen: false,
})

export function dialogKindPriority(kind: UrgentOfficeDialogKind): number {
  switch (kind) {
    case 'CARER_SOS':
      return 0
    case 'LEFT_VISIT_AREA':
      return 1
    case 'OUTSIDE_AREA_CHECK_IN_REQUEST':
      return 2
  }
}

export function visitHasLiveSos(visit: UrgentOfficeDialogVisit): boolean {
  return visit.alerts.some(alert => alert.kind === 'CARER_SOS')
}

export function liveSosAlerts(visit: UrgentOfficeDialogVisit): UrgentOfficeDialogAlert[] {
  return visit.alerts
    .filter(alert => alert.kind === 'CARER_SOS')
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function visitPriority(visit: UrgentOfficeDialogVisit): number {
  if (visit.alerts.length === 0) return 99
  return Math.min(...visit.alerts.map(alert => dialogKindPriority(alert.kind)))
}

export function earliestAlertAt(visit: UrgentOfficeDialogVisit): string {
  return visit.alerts.reduce((min, alert) => (alert.createdAt < min ? alert.createdAt : min), visit.alerts[0]?.createdAt ?? '')
}

export function sortWaitingVisits(visits: UrgentOfficeDialogVisit[]): UrgentOfficeDialogVisit[] {
  return [...visits].sort((a, b) => {
    const byPriority = visitPriority(a) - visitPriority(b)
    if (byPriority !== 0) return byPriority
    return earliestAlertAt(a).localeCompare(earliestAlertAt(b))
  })
}

export function pickNextVisitJobId(
  visits: UrgentOfficeDialogVisit[],
  exceptJobId?: string | null,
): string | null {
  const next = sortWaitingVisits(
    visits.filter(visit => !visit.deferred && visit.scheduledJobId !== exceptJobId && visit.alerts.length > 0),
  )[0]
  return next?.scheduledJobId ?? null
}

function upsertAlertOnVisit(
  visit: UrgentOfficeDialogVisit,
  alert: UrgentOfficeDialogAlert,
): UrgentOfficeDialogVisit {
  if (alert.kind === 'CARER_SOS') {
    const index = visit.alerts.findIndex(row => row.exceptionId === alert.exceptionId)
    if (index >= 0) {
      const alerts = visit.alerts.slice()
      alerts[index] = alert
      return { ...visit, alerts, deferred: false }
    }
    return { ...visit, alerts: [...visit.alerts, alert], deferred: false }
  }
  const index = visit.alerts.findIndex(row => row.kind === alert.kind)
  if (index >= 0) {
    const alerts = visit.alerts.slice()
    alerts[index] = alert
    return { ...visit, alerts, deferred: false }
  }
  return { ...visit, alerts: [...visit.alerts, alert], deferred: false }
}

export function enqueueUrgentOfficeDialog(
  state: UrgentOfficeDialogState,
  alert: UrgentOfficeDialogAlert,
): UrgentOfficeDialogState {
  const existing = state.visits.find(visit => visit.scheduledJobId === alert.scheduledJobId)
  const updatedVisit = existing
    ? upsertAlertOnVisit(existing, alert)
    : { scheduledJobId: alert.scheduledJobId, alerts: [alert], deferred: false }
  const visits = existing
    ? state.visits.map(visit => (visit.scheduledJobId === alert.scheduledJobId ? updatedVisit : visit))
    : [...state.visits, updatedVisit]

  let activeJobId = state.activeJobId
  if (!activeJobId) {
    activeJobId = alert.scheduledJobId
  } else if (alert.kind === 'CARER_SOS' && alert.scheduledJobId !== activeJobId) {
    activeJobId = alert.scheduledJobId
  }

  return { visits, activeJobId, pickerOpen: false }
}

export function selectUrgentOfficeDialogVisit(
  state: UrgentOfficeDialogState,
  jobId: string,
): UrgentOfficeDialogState {
  const exists = state.visits.some(visit => visit.scheduledJobId === jobId && visit.alerts.length > 0)
  if (!exists) return state
  return {
    visits: state.visits.map(visit =>
      visit.scheduledJobId === jobId ? { ...visit, deferred: false } : visit,
    ),
    activeJobId: jobId,
    pickerOpen: false,
  }
}

export function laterUrgentOfficeDialog(state: UrgentOfficeDialogState): UrgentOfficeDialogState {
  const active = state.visits.find(visit => visit.scheduledJobId === state.activeJobId)
  if (!active) {
    return { ...state, pickerOpen: false }
  }
  const visits = state.visits.map(visit =>
    visit.scheduledJobId === active.scheduledJobId ? { ...visit, deferred: true } : visit,
  )
  return {
    visits,
    activeJobId: pickNextVisitJobId(visits, active.scheduledJobId),
    pickerOpen: false,
  }
}

export function removeUrgentOfficeDialogException(
  state: UrgentOfficeDialogState,
  exceptionId: string,
): UrgentOfficeDialogState {
  const visits = state.visits
    .map(visit => ({
      ...visit,
      alerts: visit.alerts.filter(alert => alert.exceptionId !== exceptionId),
    }))
    .filter(visit => visit.alerts.length > 0)
  const activeStillThere = visits.some(visit => visit.scheduledJobId === state.activeJobId)
  return {
    visits,
    activeJobId: activeStillThere ? state.activeJobId : pickNextVisitJobId(visits),
    pickerOpen: false,
  }
}

export function removeUrgentOfficeDialogKind(
  state: UrgentOfficeDialogState,
  jobId: string,
  kind: UrgentOfficeDialogKind,
): UrgentOfficeDialogState {
  const visits = state.visits
    .map(visit =>
      visit.scheduledJobId === jobId
        ? { ...visit, alerts: visit.alerts.filter(alert => alert.kind !== kind) }
        : visit,
    )
    .filter(visit => visit.alerts.length > 0)
  const activeStillThere = visits.some(visit => visit.scheduledJobId === state.activeJobId)
  return {
    visits,
    activeJobId: activeStillThere ? state.activeJobId : pickNextVisitJobId(visits),
    pickerOpen: false,
  }
}

export function waitingUrgentOfficeDialogVisits(
  state: UrgentOfficeDialogState,
): UrgentOfficeDialogVisit[] {
  return sortWaitingVisits(state.visits.filter(visit => visit.scheduledJobId !== state.activeJobId))
}

export function urgentDialogAlertFromNotification(payload: {
  title: string
  message: string
  createdAt: string
  recordId?: string | null
  metadata?: Record<string, unknown> | null
}): UrgentOfficeDialogAlert | null {
  const kind = payload.metadata?.kind
  const scheduledJobId =
    typeof payload.metadata?.scheduledJobId === 'string' ? payload.metadata.scheduledJobId.trim() : ''
  const exceptionId = payload.recordId?.trim() ?? ''
  if (!isUrgentOfficeDialogKind(kind) || !scheduledJobId || !exceptionId) return null
  return {
    exceptionId,
    scheduledJobId,
    kind,
    title: payload.title,
    message: payload.message,
    createdAt: payload.createdAt,
  }
}

export function dialogHeadline(visit: UrgentOfficeDialogVisit | undefined): string {
  if (!visit) return 'Office alert'
  if (visitHasLiveSos(visit)) return 'Carer SOS'
  if (visit.alerts.some(alert => alert.kind === 'LEFT_VISIT_AREA')) {
    return 'Carer left visit — visit locked'
  }
  return 'Manual check-in needs approval'
}
