import { describe, expect, it } from 'vitest'
import type { MarChartMedicationRow } from '@/features/service-users/api/medication-mar.api'
import {
  compartmentMatchesVisitRound,
  filterCompartmentsForVisitRound,
  marRowMatchesVisitRound,
  resolveVisitMedicationRound,
} from '@/features/scheduling/utils/visit-medication-round.util'

describe('visit-medication-round.util', () => {
  it('resolves MIDDAY from visit plan code', () => {
    expect(resolveVisitMedicationRound('MIDDAY', 'Midday')).toEqual({
      code: 'MIDDAY',
      name: 'Midday',
      dueTime: '12:00',
    })
  })

  it('resolves round from label when code missing', () => {
    expect(resolveVisitMedicationRound(null, 'Evening')).toEqual({
      code: 'EVENING',
      name: 'Evening',
      dueTime: '18:00',
    })
  })

  it('matches compartment by due time and label', () => {
    const round = resolveVisitMedicationRound('MIDDAY', 'Midday')!
    expect(
      compartmentMatchesVisitRound({ label: 'Midday', dueTime: '12:00' }, round),
    ).toBe(true)
    expect(
      compartmentMatchesVisitRound({ label: 'Morning', dueTime: '08:00' }, round),
    ).toBe(false)
  })

  it('filters compartments to visit round only', () => {
    const round = resolveVisitMedicationRound('MIDDAY', 'Midday')!
    const compartments = [
      { id: '1', label: 'Morning', dueTime: '08:00' },
      { id: '2', label: 'Midday', dueTime: '12:00' },
      { id: '3', label: 'Evening', dueTime: '18:00' },
    ]
    expect(filterCompartmentsForVisitRound(compartments, round).map(c => c.label)).toEqual(['Midday'])
  })

  it('matches MAR rows for standalone meds', () => {
    const round = resolveVisitMedicationRound('EVENING', 'Evening')!
    const row = {
      dueTime: '18:00',
      timeSlot: 'Evening',
    } as MarChartMedicationRow
    expect(marRowMatchesVisitRound(row, round)).toBe(true)
    expect(marRowMatchesVisitRound({ ...row, dueTime: '08:00', timeSlot: 'Morning' }, round)).toBe(false)
  })
})
