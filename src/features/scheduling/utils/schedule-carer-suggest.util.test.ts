import { describe, expect, it } from 'vitest'
import {
  buildRotaBookedEmployeeIds,
  filterScheduleJobRecommendCarers,
  filterScheduleRunRecommendCarers,
  formatVisitPlanCarerRoleLine,
  scheduleRecommendCarersEmptyMessage,
  visitPlanCarerFitLabel,
  visitPlanCarerListWarnings,
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

  it('excludes carers blocked by compliance from job recommendations', () => {
    const rows = filterScheduleJobRecommendCarers(
      [
        candidate({ employeeId: 'blocked-compliance', complianceBlocksAllocation: true }),
        candidate({ employeeId: 'free' }),
      ],
      { showBlockedCarers: true, allocatedEmployeeIds: new Set() },
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

  it('dedupes role and job title that only differ by case', () => {
    expect(formatVisitPlanCarerRoleLine('Senior Carer', 'senior carer')).toBe('Senior Carer')
    expect(formatVisitPlanCarerRoleLine('Carer', 'Senior Carer')).toBe('Carer · Senior Carer')
  })

  it('drops warnings already shown as badges or availability summary', () => {
    expect(
      visitPlanCarerListWarnings(
        candidate({
          isPreferred: true,
          availability: { summary: 'Unavailable Sat' } as VisitPlanCarerCandidate['availability'],
          warnings: [
            'Preferred carer',
            'Unavailable Sat',
            '28 compliance item(s) need attention',
          ],
        }),
      ),
    ).toEqual(['28 compliance item(s) need attention'])
  })
})
