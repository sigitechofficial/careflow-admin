import { describe, expect, it } from 'vitest'
import type { LiveOfficeAlertException } from '@/features/ecm/utils/ecm-urgent-alert.util'
import {
  countLiveOfficeAlertsOnBoard,
  groupLiveOfficeAlertsByJobId,
  highestPriorityLiveOfficeAlert,
  liveOfficeAlertCardFit,
  liveOfficeAlertForKind,
  liveOfficeAlertChipText,
  liveOfficeAlertChipIsSentence,
  liveOfficeAlertKey,
  unableToStartReasonFromException,
} from './schedule-job-live-office-alerts.util'

function row(
  partial: Partial<LiveOfficeAlertException> & Pick<LiveOfficeAlertException, 'kind' | 'scheduledJobId'>,
): LiveOfficeAlertException {
  return {
    lifecycle: 'ALERT_GENERATED',
    plannedDate: '2026-09-14',
    ...partial,
  }
}

describe('schedule-job-live-office-alerts.util', () => {
  it('groups unique live kinds per job, sorted SOS first', () => {
    const byJob = groupLiveOfficeAlertsByJobId(
      [
        row({ kind: 'UNABLE_TO_START', scheduledJobId: 'job-1' }),
        row({ kind: 'CARER_SOS', scheduledJobId: 'job-1' }),
        row({ kind: 'CARER_SOS', scheduledJobId: 'job-1' }),
        row({ kind: 'LEFT_VISIT_AREA', scheduledJobId: 'job-2' }),
      ],
      { date: '2026-09-14' },
    )
    expect(byJob.get('job-1')?.map((alert) => alert.kind)).toEqual(['CARER_SOS', 'UNABLE_TO_START'])
    expect(byJob.get('job-2')?.map((alert) => alert.kind)).toEqual(['LEFT_VISIT_AREA'])
  })

  it('drops other-day rows and jobs not on the board', () => {
    const byJob = groupLiveOfficeAlertsByJobId(
      [
        row({ kind: 'CARER_SOS', scheduledJobId: 'today', plannedDate: '2026-09-14' }),
        row({ kind: 'CARER_SOS', scheduledJobId: 'yesterday', plannedDate: '2026-09-13' }),
        row({ kind: 'LEFT_VISIT_AREA', scheduledJobId: 'hidden', plannedDate: '2026-09-14' }),
      ],
      { date: '2026-09-14', jobIds: new Set(['today']) },
    )
    expect([...byJob.keys()]).toEqual(['today'])
  })

  it('counts visits and remembers the first job per kind', () => {
    const byJob = groupLiveOfficeAlertsByJobId(
      [
        row({ kind: 'CARER_SOS', scheduledJobId: 'sos-job' }),
        row({ kind: 'OUTSIDE_AREA_CHECK_IN_REQUEST', scheduledJobId: 'check-job' }),
        row({
          kind: 'CARER_SOS',
          scheduledJobId: 'acked',
          acknowledgedAt: '2026-09-14T10:00:00Z',
        }),
      ],
      { date: '2026-09-14' },
    )
    const counts = countLiveOfficeAlertsOnBoard(byJob)
    expect(counts.visitCount).toBe(2)
    expect(counts.sos).toBe(1)
    expect(counts.checkIn).toBe(1)
    expect(counts.firstJobIdByKind.CARER_SOS).toBe('sos-job')
    expect(counts.firstJobIdByKind.OUTSIDE_AREA_CHECK_IN_REQUEST).toBe('check-job')
  })

  it('drops SOS after acknowledge so the board popup clears', () => {
    const byJob = groupLiveOfficeAlertsByJobId(
      [
        row({
          kind: 'CARER_SOS',
          scheduledJobId: 'job-1',
          lifecycle: 'ACKNOWLEDGED',
          acknowledgedAt: '2026-09-14T10:00:00Z',
        }),
      ],
      { date: '2026-09-14' },
    )
    expect(byJob.has('job-1')).toBe(false)
  })

  it('picks SOS as the highest-priority pulse and uses ECM chip colors', () => {
    const alerts = [
      liveOfficeAlertForKind('UNABLE_TO_START'),
      liveOfficeAlertForKind('CARER_SOS'),
    ]
    expect(highestPriorityLiveOfficeAlert(alerts)?.kind).toBe('CARER_SOS')
    expect(liveOfficeAlertForKind('CARER_SOS').chipClass).toContain('bg-red-600')
    expect(liveOfficeAlertForKind('CARER_SOS').pulseClass).toContain('bg-rose-50')
    expect(liveOfficeAlertForKind('CARER_SOS').pulseClass).toContain('schedule-job-live-alert-danger')
    expect(liveOfficeAlertForKind('UNABLE_TO_START').pulseClass).toContain('schedule-job-live-alert-warn')
    expect(liveOfficeAlertForKind('OUTSIDE_AREA_CHECK_IN_REQUEST').shortLabel).toBe('Auth request')
    expect(liveOfficeAlertForKind('OUTSIDE_AREA_CHECK_IN_REQUEST').hint).toBe('Needs allow')
    expect(liveOfficeAlertForKind('OUTSIDE_AREA_CHECK_IN_REQUEST').label).toBe(
      'Manual authorisation request',
    )
    expect(liveOfficeAlertChipText(liveOfficeAlertForKind('OUTSIDE_AREA_CHECK_IN_REQUEST'))).toBe(
      'Manual authorisation request',
    )
    expect(liveOfficeAlertKey(alerts)).toContain('CARER_SOS')
  })

  it('keeps the latest SOS payload including GPS and message', () => {
    const byJob = groupLiveOfficeAlertsByJobId(
      [
        row({
          kind: 'CARER_SOS',
          scheduledJobId: 'job-1',
          createdAt: '2026-09-14T09:00:00Z',
          sos: { createdAt: '2026-09-14T09:00:00Z', message: 'old', latitude: 1, longitude: 1 },
        }),
        row({
          kind: 'CARER_SOS',
          scheduledJobId: 'job-1',
          createdAt: '2026-09-14T10:04:00Z',
          sos: {
            createdAt: '2026-09-14T10:04:00Z',
            message: 'Need help',
            employeeName: 'Aisha Ali',
            employeeId: 'emp-1',
            latitude: 51.5,
            longitude: -0.1,
          },
        }),
      ],
      { date: '2026-09-14' },
    )
    const sos = byJob.get('job-1')?.[0]
    expect(sos?.message).toBe('Need help')
    expect(sos?.employeeFirstName).toBe('Aisha')
    expect(sos?.hasGps).toBe(true)
    expect(sos?.sentAt).toBe('2026-09-14T10:04:00Z')
  })

  it('hides extra lines on a narrow or stacked visit block', () => {
    expect(liveOfficeAlertCardFit(80, false)).toEqual({
      showSentTime: false,
      showMeta: false,
      showSender: false,
      showMessage: false,
    })
    expect(liveOfficeAlertCardFit(180, false).showMeta).toBe(true)
    expect(liveOfficeAlertCardFit(180, true).showMeta).toBe(false)
  })

  it('puts the unable-to-start reason on the board card, not a CAN\'T START chip', () => {
    expect(liveOfficeAlertChipIsSentence(liveOfficeAlertForKind('UNABLE_TO_START'))).toBe(true)
    expect(liveOfficeAlertChipText(liveOfficeAlertForKind('UNABLE_TO_START'))).toBe(
      'Unable to start',
    )
    expect(
      unableToStartReasonFromException(
        row({
          kind: 'UNABLE_TO_START',
          scheduledJobId: 'job-1',
          title: 'Unable to start — Client not at home',
          detail: 'Nobody answered',
        }),
      ),
    ).toBe('Client not at home')

    const byJob = groupLiveOfficeAlertsByJobId(
      [
        row({
          kind: 'UNABLE_TO_START',
          scheduledJobId: 'job-1',
          title: 'Unable to start — Client not at home',
          detail: 'Nobody answered',
        }),
      ],
      { date: '2026-09-14' },
    )
    const alert = byJob.get('job-1')?.[0]
    expect(alert?.hint).toBe('Client not at home')
    expect(alert?.message).toBe('Nobody answered')
  })

  it('describes left visit area as ops paused, not a LEFT chip', () => {
    const meta = liveOfficeAlertForKind('LEFT_VISIT_AREA')
    expect(liveOfficeAlertChipIsSentence(meta)).toBe(true)
    expect(liveOfficeAlertChipText(meta)).toBe('Left visit area')
    expect(meta.hint).toBe('Ops paused')

    const byJob = groupLiveOfficeAlertsByJobId(
      [row({ kind: 'LEFT_VISIT_AREA', scheduledJobId: 'job-2' })],
      { date: '2026-09-14' },
    )
    expect(byJob.get('job-2')?.[0]?.hint).toBe('Ops paused')
  })
})
