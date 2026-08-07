import { describe, expect, it } from 'vitest'
import type { EcmDailyOpsReport } from '@/features/ecm/api/ecm.api'
import {
  buildArrivalClassificationTable,
  buildExceptionRegisterCsv,
  buildReportSummaryCsv,
  resolveExceptionRegister,
} from '@/features/ecm/utils/ecm-reports-pack.util'

function sampleReport(overrides?: Partial<EcmDailyOpsReport>): EcmDailyOpsReport {
  return {
    reportType: 'daily-operations',
    date: '2026-08-06',
    dateFrom: '2026-08-06',
    dateTo: '2026-08-06',
    refreshedAt: '2026-08-07T00:00:00.000Z',
    operationalTimezone: 'Europe/London',
    thresholdVersion: 'org-v3',
    kpis: {
      punctuality: {
        numerator: 8,
        denominator: 10,
        rate: 80,
        exclusions: { confirmedMissed: 1, falseEcmAlerts: 0, disputed: 0 },
      },
      electronicMonitoring: { numerator: 9, denominator: 10, rate: 90 },
      lateArrivals: 2,
      earlyArrivals: 1,
      shortVisits: 1,
      longVisits: 0,
      potentialMissed: 0,
      confirmedMissed: 1,
      manualAttendance: 1,
      electronicAttendance: 9,
      geofenceBreaches: 1,
      verifiedConfidence: 7,
      totalVisits: 10,
      exceptionRegisterCount: 3,
    },
    classifications: {
      arrival: {
        onTime: 8,
        early: 1,
        late: 1,
        veryLate: 1,
        notAssessed: 0,
        total: 10,
      },
      duration: {
        onTime: 9,
        short: 1,
        long: 0,
        excessiveOverrun: 0,
        notAssessed: 0,
        total: 10,
      },
    },
    integrity: {
      verified: 7,
      partiallyVerified: 1,
      manuallyVerified: 1,
      unverified: 1,
      disputed: 0,
      rejected: 0,
    },
    rows: [
      {
        scheduledJobId: 'a',
        jobName: 'Morning',
        serviceUserName: 'Ada Lovelace',
        carerNames: ['Grace Hopper'],
        plannedStartDateTime: '2026-08-06T08:00:00.000Z',
        lifecycleStatus: 'COMPLETED',
        arrivalClassification: 'ON_TIME',
        durationClassification: 'ON_TIME',
        missedClassification: 'NONE',
        confidence: 'VERIFIED',
        criticality: 'STANDARD',
        startVarianceMinutes: 0,
        durationVarianceMinutes: 0,
        operationalExceptionCodes: [],
        inExceptionRegister: false,
        exceptionReasons: [],
      },
      {
        scheduledJobId: 'b',
        jobName: 'Lunch',
        serviceUserName: 'Alan Turing',
        carerNames: ['Ada'],
        plannedStartDateTime: '2026-08-06T12:00:00.000Z',
        lifecycleStatus: 'COMPLETED_WITH_EXCEPTION',
        arrivalClassification: 'LATE_ARRIVAL',
        durationClassification: 'SHORT_VISIT',
        missedClassification: 'NONE',
        confidence: 'UNVERIFIED',
        criticality: 'PRIORITY',
        startVarianceMinutes: 18,
        durationVarianceMinutes: -12,
        operationalExceptionCodes: ['OUTSIDE_GEOFENCE'],
        inExceptionRegister: true,
        exceptionReasons: ['LATE_ARRIVAL', 'SHORT_VISIT', 'OUTSIDE_GEOFENCE'],
      },
    ],
    exceptionRegister: [
      {
        scheduledJobId: 'b',
        jobName: 'Lunch',
        serviceUserName: 'Alan Turing',
        carerNames: ['Ada'],
        plannedStartDateTime: '2026-08-06T12:00:00.000Z',
        lifecycleStatus: 'COMPLETED_WITH_EXCEPTION',
        arrivalClassification: 'LATE_ARRIVAL',
        durationClassification: 'SHORT_VISIT',
        missedClassification: 'NONE',
        confidence: 'UNVERIFIED',
        criticality: 'PRIORITY',
        startVarianceMinutes: 18,
        durationVarianceMinutes: -12,
        operationalExceptionCodes: ['OUTSIDE_GEOFENCE'],
        inExceptionRegister: true,
        exceptionReasons: ['LATE_ARRIVAL', 'SHORT_VISIT', 'OUTSIDE_GEOFENCE'],
      },
    ],
    ...overrides,
  }
}

describe('ecm-reports-pack.util', () => {
  it('prefers API exceptionRegister when present', () => {
    const report = sampleReport()
    expect(resolveExceptionRegister(report)).toHaveLength(1)
    expect(resolveExceptionRegister(report)[0]?.scheduledJobId).toBe('b')
  })

  it('falls back to row heuristics when exceptionRegister omitted', () => {
    const report = sampleReport({ exceptionRegister: undefined })
    const rows = resolveExceptionRegister(report)
    expect(rows.map((r) => r.scheduledJobId)).toEqual(['b'])
  })

  it('builds arrival table from classifications SSOT with n/d', () => {
    const table = buildArrivalClassificationTable(sampleReport())
    const late = table.find((r) => r.key === 'late')
    expect(late?.count).toBe(1)
    expect(late?.denominator).toBe(10)
  })

  it('exports summary CSV with threshold and punctuality n/d', () => {
    const csv = buildReportSummaryCsv(sampleReport())
    expect(csv).toContain('thresholdVersion,org-v3')
    expect(csv).toContain('punctualityNumerator,8')
    expect(csv).toContain('punctualityDenominator,10')
    expect(csv).toContain('operationalTimezone,Europe/London')
  })

  it('exports exception register CSV with reason codes', () => {
    const csv = buildExceptionRegisterCsv(sampleReport().exceptionRegister ?? [])
    expect(csv).toContain('Alan Turing')
    expect(csv).toContain('LATE_ARRIVAL|SHORT_VISIT|OUTSIDE_GEOFENCE')
    expect(csv).toContain('scheduledJobId')
  })
})
