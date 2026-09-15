import { describe, expect, it } from 'vitest'
import {
  dialogHeadline,
  enqueueUrgentOfficeDialog,
  emptyUrgentOfficeDialogState,
  laterUrgentOfficeDialog,
  removeUrgentOfficeDialogKind,
  selectUrgentOfficeDialogVisit,
  urgentDialogAlertFromNotification,
  waitingUrgentOfficeDialogVisits,
  type UrgentOfficeDialogAlert,
} from './ecm-urgent-dialog.util'

function alert(partial: Partial<UrgentOfficeDialogAlert> & Pick<UrgentOfficeDialogAlert, 'kind'>): UrgentOfficeDialogAlert {
  return {
    exceptionId: partial.exceptionId ?? `${partial.kind}-1`,
    scheduledJobId: partial.scheduledJobId ?? 'job-1',
    title: partial.title ?? partial.kind,
    message: partial.message ?? 'msg',
    createdAt: partial.createdAt ?? '2026-09-15T10:00:00.000Z',
    kind: partial.kind,
  }
}

describe('urgentDialogAlertFromNotification', () => {
  it('accepts the three dialog kinds and ignores others', () => {
    expect(
      urgentDialogAlertFromNotification({
        title: 'SOS',
        message: 'm',
        createdAt: 't',
        recordId: 'ex-1',
        metadata: { kind: 'CARER_SOS', scheduledJobId: 'job-1' },
      })?.kind,
    ).toBe('CARER_SOS')
    expect(
      urgentDialogAlertFromNotification({
        title: 'Auth',
        message: 'm',
        createdAt: 't',
        recordId: 'ex-2',
        metadata: { kind: 'OUTSIDE_AREA_CHECK_IN_REQUEST', scheduledJobId: 'job-1' },
      })?.kind,
    ).toBe('OUTSIDE_AREA_CHECK_IN_REQUEST')
    expect(
      urgentDialogAlertFromNotification({
        title: 'Late',
        message: 'm',
        createdAt: 't',
        recordId: 'ex-3',
        metadata: { kind: 'UNABLE_TO_START', scheduledJobId: 'job-1' },
      }),
    ).toBeNull()
  })
})

describe('enqueueUrgentOfficeDialog', () => {
  it('groups SOS and left-area on the same visit into one dialog', () => {
    let state = enqueueUrgentOfficeDialog(emptyUrgentOfficeDialogState(), alert({ kind: 'CARER_SOS' }))
    state = enqueueUrgentOfficeDialog(state, alert({ kind: 'LEFT_VISIT_AREA', exceptionId: 'left-1' }))
    expect(state.visits).toHaveLength(1)
    expect(state.visits[0]?.alerts.map(row => row.kind)).toEqual(['CARER_SOS', 'LEFT_VISIT_AREA'])
    expect(state.activeJobId).toBe('job-1')
    expect(dialogHeadline(state.visits[0])).toBe('Carer SOS')
  })

  it('after close, a new SOS on the same visit reopens with both unacked alerts', () => {
    let state = enqueueUrgentOfficeDialog(
      emptyUrgentOfficeDialogState(),
      alert({ kind: 'CARER_SOS', exceptionId: 'sos-1', message: 'first' }),
    )
    state = laterUrgentOfficeDialog(state)
    expect(state.activeJobId).toBeNull()
    state = enqueueUrgentOfficeDialog(
      state,
      alert({ kind: 'CARER_SOS', exceptionId: 'sos-2', message: 'second', createdAt: '2026-09-15T07:21:00.000Z' }),
    )
    expect(state.activeJobId).toBe('job-1')
    expect(state.visits[0]?.deferred).toBe(false)
    expect(state.visits[0]?.alerts.map(row => row.exceptionId)).toEqual(['sos-1', 'sos-2'])
  })

  it('keeps every unacked SOS on the same visit', () => {
    let state = enqueueUrgentOfficeDialog(
      emptyUrgentOfficeDialogState(),
      alert({ kind: 'CARER_SOS', exceptionId: 'sos-1', message: 'first', createdAt: '2026-09-15T07:14:00.000Z' }),
    )
    state = enqueueUrgentOfficeDialog(
      state,
      alert({ kind: 'CARER_SOS', exceptionId: 'sos-2', message: 'second', createdAt: '2026-09-15T07:21:00.000Z' }),
    )
    expect(state.visits[0]?.alerts.filter(row => row.kind === 'CARER_SOS')).toHaveLength(2)
    expect(state.visits[0]?.alerts.map(row => row.exceptionId)).toEqual(['sos-1', 'sos-2'])
  })

  it('replaces the same left-area kind on a visit instead of stacking', () => {
    let state = enqueueUrgentOfficeDialog(
      emptyUrgentOfficeDialogState(),
      alert({ kind: 'LEFT_VISIT_AREA', exceptionId: 'left-1' }),
    )
    state = enqueueUrgentOfficeDialog(
      state,
      alert({ kind: 'LEFT_VISIT_AREA', exceptionId: 'left-2', createdAt: '2026-09-15T10:05:00.000Z' }),
    )
    expect(state.visits[0]?.alerts).toHaveLength(1)
    expect(state.visits[0]?.alerts[0]?.exceptionId).toBe('left-2')
  })

  it('switches to a new visit when a SOS arrives while a lower-priority dialog is open', () => {
    let state = enqueueUrgentOfficeDialog(
      emptyUrgentOfficeDialogState(),
      alert({ kind: 'LEFT_VISIT_AREA', scheduledJobId: 'job-a' }),
    )
    state = enqueueUrgentOfficeDialog(
      state,
      alert({ kind: 'CARER_SOS', scheduledJobId: 'job-b', exceptionId: 'sos-b' }),
    )
    expect(state.activeJobId).toBe('job-b')
    expect(waitingUrgentOfficeDialogVisits(state).map(visit => visit.scheduledJobId)).toEqual(['job-a'])
  })
})

describe('later and switch', () => {
  it('close / Later defers the current visit including SOS', () => {
    const state = enqueueUrgentOfficeDialog(emptyUrgentOfficeDialogState(), alert({ kind: 'CARER_SOS' }))
    const next = laterUrgentOfficeDialog(state)
    expect(next.activeJobId).toBeNull()
    expect(next.visits[0]?.deferred).toBe(true)
  })

  it('Later moves to the next waiting visit and keeps the first in the switch list', () => {
    let state = enqueueUrgentOfficeDialog(
      emptyUrgentOfficeDialogState(),
      alert({ kind: 'LEFT_VISIT_AREA', scheduledJobId: 'job-a' }),
    )
    state = enqueueUrgentOfficeDialog(
      state,
      alert({ kind: 'OUTSIDE_AREA_CHECK_IN_REQUEST', scheduledJobId: 'job-b', exceptionId: 'auth-1' }),
    )
    expect(state.activeJobId).toBe('job-a')
    state = laterUrgentOfficeDialog(state)
    expect(state.activeJobId).toBe('job-b')
    expect(waitingUrgentOfficeDialogVisits(state).map(visit => visit.scheduledJobId)).toEqual(['job-a'])
    state = selectUrgentOfficeDialogVisit(state, 'job-a')
    expect(state.activeJobId).toBe('job-a')
  })

  it('drops a visit when its last kind is removed and shows the next', () => {
    let state = enqueueUrgentOfficeDialog(
      emptyUrgentOfficeDialogState(),
      alert({ kind: 'LEFT_VISIT_AREA', scheduledJobId: 'job-a' }),
    )
    state = enqueueUrgentOfficeDialog(
      state,
      alert({ kind: 'OUTSIDE_AREA_CHECK_IN_REQUEST', scheduledJobId: 'job-b', exceptionId: 'auth-1' }),
    )
    state = removeUrgentOfficeDialogKind(state, 'job-a', 'LEFT_VISIT_AREA')
    expect(state.activeJobId).toBe('job-b')
    expect(state.visits).toHaveLength(1)
  })
})
