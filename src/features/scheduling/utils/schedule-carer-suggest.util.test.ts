import { describe, expect, it } from 'vitest'
import {
  buildRotaBookedEmployeeIds,
  filterScheduleJobRecommendCarers,
  filterScheduleRunRecommendCarers,
  scheduleRecommendCarersEmptyMessage,
  visitPlanCarerFitLabel,
} from '@/features/scheduling/utils/schedule-carer-suggest.util'
import type { VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'

const candidate = (overrides: Partial<VisitPlanCarerCandidate>): VisitPlanCarerCandidate =>
  ({
    employeeId: 'emp-1',
    displayName: 'Test Carer',
    fit: 'good',
    isPreferred: false,
    isBlocked: false,
    hasRotaConflict: false,
    role: null,
    jobTitle: null,
    warnings: [],
    availability: { summary: 'Available' },
    ...overrides,
  }) as VisitPlanCarerCandidate

describe('schedule-carer-suggest.util', () => {
  it('builds rota booked employee ids', () => {
    const ids = buildRotaBookedEmployeeIds([
      candidate({ employeeId: 'a', hasRotaConflict: true }),
      candidate({ employeeId: 'b', hasRotaConflict: false }),
    ])
    expect([...ids]).toEqual(['a'])
  })

  it('filters job recommendations by allocation and rota conflict', () => {
    const rows = filterScheduleJobRecommendCarers(
      [
        candidate({ employeeId: 'allocated', hasRotaConflict: false }),
        candidate({ employeeId: 'booked', hasRotaConflict: true }),
        candidate({ employeeId: 'free', hasRotaConflict: false }),
      ],
      { showBlockedCarers: true, allocatedEmployeeIds: new Set(['allocated']) },
    )
    expect(rows.map((row) => row.employeeId)).toEqual(['free'])
  })

  it('filters run recommendations and sorts preferred first', () => {
    const rows = filterScheduleRunRecommendCarers(
      [
        candidate({ employeeId: 'b', isPreferred: false }),
        candidate({ employeeId: 'a', isPreferred: true, hasRotaConflict: false }),
        candidate({ employeeId: 'c', hasRotaConflict: true }),
      ],
      true,
    )
    expect(rows.map((row) => row.employeeId)).toEqual(['a', 'b'])
  })

  it('returns rota-specific empty message when all candidates conflict', () => {
    expect(
      scheduleRecommendCarersEmptyMessage(
        [candidate({ hasRotaConflict: true })],
        'No recommendations available.',
      ),
    ).toContain('already booked')
    expect(visitPlanCarerFitLabel('partial')).toBe('Partial match')
  })
})
