import { describe, expect, it } from 'vitest'
import {
  countExceptionQueueTabFlags,
  isClosedEcmExceptionLifecycle,
  isLiveCarerSos,
  isLiveLeftVisitArea,
  isLiveOutsideAreaCheckIn,
  isLiveUnableToStart,
  isUrgentOfficeAlertKind,
  liveOfficeAlertKindForRow,
  markLiveOfficeAlertAcknowledged,
  markLeftVisitAreaAllowed,
  markCheckInRequestDecided,
  markLiveOfficeAlertClosed,
  type LiveOfficeAlertException,
} from './ecm-urgent-alert.util'

function row(partial: Partial<LiveOfficeAlertException> & Pick<LiveOfficeAlertException, 'kind'>): LiveOfficeAlertException {
  return {
    scheduledJobId: 'job-1',
    lifecycle: 'ALERT_GENERATED',
    ...partial,
  }
}

describe('ecm-urgent-alert.util', () => {
  it('treats SOS / left area / unable to start as ringing office alerts', () => {
    expect(isUrgentOfficeAlertKind('CARER_SOS')).toBe(true)
    expect(isUrgentOfficeAlertKind('OUTSIDE_AREA_CHECK_IN_REQUEST')).toBe(false)
  })

  it('closes resolved, manager-reviewed, and closed lifecycles', () => {
    expect(isClosedEcmExceptionLifecycle('RESOLVED')).toBe(true)
    expect(isClosedEcmExceptionLifecycle('DETECTED')).toBe(false)
  })

  it('flags unacknowledged SOS only', () => {
    expect(isLiveCarerSos(row({ kind: 'CARER_SOS' }))).toBe(true)
    expect(isLiveCarerSos(row({ kind: 'CARER_SOS', acknowledgedAt: '2026-09-14T10:00:00Z' }))).toBe(
      false,
    )
    expect(
      isLiveCarerSos(row({ kind: 'CARER_SOS', sos: { acknowledgedAt: '2026-09-14T10:00:00Z' } })),
    ).toBe(false)
    expect(isLiveCarerSos(row({ kind: 'CARER_SOS', lifecycle: 'ACKNOWLEDGED' }))).toBe(false)
  })

  it('patches the matching SOS so the board no longer treats it as live', () => {
    const patched = markLiveOfficeAlertAcknowledged(
      [
        row({ id: 'sos-1', kind: 'CARER_SOS' }),
        row({ id: 'sos-2', kind: 'CARER_SOS' }),
      ],
      'sos-1',
      '2026-09-14T10:00:00Z',
    )
    expect(isLiveCarerSos(patched[0]!)).toBe(false)
    expect(patched[0]?.lifecycle).toBe('ACKNOWLEDGED')
    expect(patched[0]?.acknowledgedAt).toBe('2026-09-14T10:00:00Z')
    expect(isLiveCarerSos(patched[1]!)).toBe(true)
  })

  it('clears left-area, check-in, and unable-to-start after office action patches', () => {
    const left = markLeftVisitAreaAllowed(
      [row({ kind: 'LEFT_VISIT_AREA', scheduledJobId: 'job-1', areaLock: { status: 'LOCKED' } })],
      'job-1',
    )
    expect(isLiveLeftVisitArea(left[0]!)).toBe(false)

    const checkIn = markCheckInRequestDecided(
      [row({ kind: 'OUTSIDE_AREA_CHECK_IN_REQUEST', scheduledJobId: 'job-1' })],
      'job-1',
      'AUTHORISED',
    )
    expect(isLiveOutsideAreaCheckIn(checkIn[0]!)).toBe(false)

    const closed = markLiveOfficeAlertClosed(
      [row({ id: 'uts-1', kind: 'UNABLE_TO_START' })],
      'uts-1',
    )
    expect(isLiveUnableToStart(closed[0]!)).toBe(false)
  })

  it('flags left visit area until office allows continue', () => {
    expect(isLiveLeftVisitArea(row({ kind: 'LEFT_VISIT_AREA' }))).toBe(true)
    expect(
      isLiveLeftVisitArea(row({ kind: 'LEFT_VISIT_AREA', areaLock: { status: 'LOCKED' } })),
    ).toBe(true)
    expect(
      isLiveLeftVisitArea(row({ kind: 'LEFT_VISIT_AREA', areaLock: { status: 'ALLOWED' } })),
    ).toBe(false)
  })

  it('flags open unable-to-start and pending outside-area check-in', () => {
    expect(isLiveUnableToStart(row({ kind: 'UNABLE_TO_START' }))).toBe(true)
    expect(isLiveUnableToStart(row({ kind: 'UNABLE_TO_START', lifecycle: 'CLOSED' }))).toBe(false)
    expect(isLiveOutsideAreaCheckIn(row({ kind: 'OUTSIDE_AREA_CHECK_IN_REQUEST' }))).toBe(true)
    expect(
      isLiveOutsideAreaCheckIn(
        row({
          kind: 'OUTSIDE_AREA_CHECK_IN_REQUEST',
          checkInMethodRequest: { status: 'AUTHORISED' },
        }),
      ),
    ).toBe(false)
  })

  it('returns the matching live kind, preferring SOS over other flags on the same row', () => {
    expect(liveOfficeAlertKindForRow(row({ kind: 'CARER_SOS' }))).toBe('CARER_SOS')
    expect(liveOfficeAlertKindForRow(row({ kind: 'LATE_ARRIVAL' }))).toBeNull()
  })

  it('counts distinct visits per tab flag', () => {
    const flags = countExceptionQueueTabFlags([
      row({ kind: 'CARER_SOS', scheduledJobId: 'a' }),
      row({ kind: 'CARER_SOS', scheduledJobId: 'a' }),
      row({ kind: 'LEFT_VISIT_AREA', scheduledJobId: 'b', areaLock: { status: 'LOCKED' } }),
      row({ kind: 'UNABLE_TO_START', scheduledJobId: 'c' }),
      row({ kind: 'OUTSIDE_AREA_CHECK_IN_REQUEST', scheduledJobId: 'd' }),
      row({ kind: 'CARER_SOS', scheduledJobId: 'e', acknowledgedAt: '2026-09-14T10:00:00Z' }),
    ])
    expect(flags).toEqual({
      sosVisitCount: 1,
      lockedAreaVisitCount: 1,
      unableToStartVisitCount: 1,
      checkInRequestVisitCount: 1,
    })
  })
})
