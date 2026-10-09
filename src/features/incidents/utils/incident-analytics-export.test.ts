import { describe, expect, it } from 'vitest'
import type { IncidentAnalytics, IncidentListItem } from '@/features/incidents/types'
import {
  buildAnalyticsSummaryCsv,
  buildIncidentListCsv,
  formatClosureTime,
  formatTrendMonth,
  weekRowsMondayFirst,
} from './incident-analytics-export'

const analytics: IncidentAnalytics = {
  totals: {
    total: 3,
    open: 2,
    closed: 1,
    underReview: 0,
    notPickedUp: 2,
    underInvestigation: 0,
    highCritical: 1,
    falls: 1,
    medication: 0,
    nearMiss: 0,
    involvingEmployees: 1,
    overdueActions: 0,
    repeatServiceUsers: 1,
    averageClosureHours: 72,
  },
  bySeverity: { LOW: 1, MEDIUM: 1, HIGH: 1, CRITICAL: 0 },
  byStatus: { REPORTED: 2, CLOSED: 1 },
  byCategory: [{ key: 'ACCIDENT', label: 'Accident', count: 3 }],
  bySubtype: [{ key: 'FALL', label: 'Fall', count: 1 }],
  byLocation: [{ id: 'l1', name: 'Merton', count: 3 }],
  byServiceUser: [{ id: 's1', name: 'Patel, "Mike"', count: 2 }],
  byReporter: [{ id: 'e1', name: 'Liam Walsh', count: 2 }],
  bySource: { carerApp: 2, office: 1 },
  byTimeOfDay: [{ key: 'MORNING', label: 'Morning (06–12)', count: 3 }],
  byDayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => ({ day, count: i })),
  injuryTypes: [{ type: 'Bruising', count: 1 }],
  monthlyTrend: [{ month: '2026-10', count: 3 }],
  warnings: [],
}

describe('incident analytics export', () => {
  it('formats trend months and closure time', () => {
    expect(formatTrendMonth('2026-10')).toBe('Oct 26')
    expect(formatTrendMonth('2027-01')).toBe('Jan 27')
    expect(formatClosureTime(null)).toBe('—')
    expect(formatClosureTime(5.25)).toBe('5.3 h')
    expect(formatClosureTime(72)).toBe('3 days')
  })

  it('puts Monday first', () => {
    expect(weekRowsMondayFirst(analytics.byDayOfWeek).map((d) => d.day)).toEqual([
      'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
    ])
  })

  it('builds the summary with a BOM, every section, and escaped text', () => {
    const csv = buildAnalyticsSummaryCsv(analytics, { generatedAt: 'now', period: 'All dates', filters: 'None' })
    expect(csv.startsWith('\uFEFFIncident analytics')).toBe(true)
    expect(csv).toContain('By branch,Merton,3')
    expect(csv).toContain('By status,Reported,2')
    expect(csv).toContain('Day of week (UK time),Mon,1')
    expect(csv).toContain('Service users with most incidents,"Patel, ""Mike""",2')
    expect(csv).toContain('Totals,Average time to close,3 days')
    expect(csv).toContain('Reported from,Carer app,2')
    expect(csv).toContain('Reported by (carer),Liam Walsh,2')
  })

  it('builds one row per incident, carer-app reports recorded by "Carer app"', () => {
    const item = {
      referenceNumber: 'INC-2026-000001',
      occurredAt: '2026-10-06T07:50:00.000Z',
      category: { id: 'c', key: 'ACCIDENT', label: 'Accident' },
      subtype: { id: 's', key: 'FALL', label: 'Fall' },
      severityLabel: 'High',
      statusLabel: 'Closed',
      serviceUserName: 'Michael Patel',
      locationName: 'Merton',
      reportedBy: { name: 'Liam Walsh', source: 'CARER_APP', roles: [], recordedByName: null },
      visitRef: 'VIS-L06-20261006-0006',
    } as unknown as IncidentListItem
    const lines = buildIncidentListCsv([item], () => '06/10/2026 08:50').trim().split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toBe(
      'INC-2026-000001,06/10/2026 08:50,Accident,Fall,High,Closed,Michael Patel,Merton,Liam Walsh,Carer app,VIS-L06-20261006-0006',
    )
  })
})
