import { describe, expect, it } from 'vitest'
import type { MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
import {
  collectVisitDateMarSlots,
  summarizeVisitDateMarSlots,
  visitDateChartMonth,
} from '@/features/scheduling/utils/visit-mar-daily.util'

function row(
  id: string,
  name: string,
  days: MarChartMedicationRow['days'],
  extra?: Partial<MarChartMedicationRow>,
): MarChartMedicationRow {
  return {
    medicationId: id,
    scheduleId: `${id}-sch`,
    medicationName: name,
    packName: null,
    dose: '1 tablet',
    strength: '5mg',
    routeName: 'Oral',
    type: 'Tablet',
    frequency: 'Daily',
    scheduleType: 'daily',
    timeSlot: 'Morning',
    dueTime: '08:00',
    roundWindowStart: '07:00',
    roundWindowEnd: '10:00',
    startDate: null,
    endDate: null,
    days,
    ...extra,
  }
}

describe('visit-mar-daily.util', () => {
  it('derives chart month from visit date', () => {
    expect(visitDateChartMonth('2026-06-15')).toBe('2026-06')
  })

  it('collects due and recorded slots for visit date', () => {
    const meds = [
      row('a', 'Amlodipine', [
        { day: 15, date: '2026-06-15', cellState: 'due', recordId: null, statusCode: null, statusLabel: null, color: null, textColor: null, requiresReview: false },
        { day: 16, date: '2026-06-16', cellState: 'na', recordId: null, statusCode: null, statusLabel: null, color: null, textColor: null, requiresReview: false },
      ]),
      row('b', 'Metformin', [
        { day: 15, date: '2026-06-15', cellState: 'recorded', recordId: 'ev-1', statusCode: 'G', statusLabel: 'Given', color: '#0f0', textColor: '#fff', requiresReview: false },
      ]),
      row('c', 'PRN Med', [
        { day: 15, date: '2026-06-15', cellState: 'na', recordId: null, statusCode: null, statusLabel: null, color: null, textColor: null, requiresReview: false },
      ], { scheduleType: 'prn' }),
    ]

    const slots = collectVisitDateMarSlots(meds, '2026-06-15')
    expect(slots).toHaveLength(2)
    expect(slots.map(s => s.row.medicationName)).toEqual(['Amlodipine', 'Metformin'])
    expect(summarizeVisitDateMarSlots(slots)).toEqual({ due: 1, recorded: 1, prn: 0 })
  })
})
