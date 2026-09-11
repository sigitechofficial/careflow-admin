import { describe, expect, it } from 'vitest'
import type { ServiceUserLookupsBundle } from '@/features/service-users/types'
import {
  buildServiceUsersListParams,
  clearAdvancedFilterChip,
  countActiveAdvancedFilters,
  countAdvancedFiltersInGroup,
  advancedFilterRangeErrors,
  describeAdvancedFilterChips,
  riskLevelIdForCode,
} from '@/features/service-users/utils/service-users-list-query'

const lookups = {
  statuses: [{ id: 'st-active', code: 'ACTIVE', name: 'Active' }],
  riskLevels: [
    { id: 'rl-high', code: 'HIGH', name: 'High' },
    { id: 'rl-low', code: 'LOW', name: 'Low' },
  ],
} as unknown as ServiceUserLookupsBundle

describe('buildServiceUsersListParams advanced filters', () => {
  it('maps risk code and advanced flags to API params', () => {
    const params = buildServiceUsersListParams(lookups, {
      page: 2,
      listFilter: null,
      statusFilter: 'ACTIVE',
      onHoldOnly: false,
      riskLevelCode: 'HIGH',
      unassignedKeyWorker: true,
      advanced: {
        ageMin: 65,
        ageMax: 90,
        hasActiveFlashMessage: true,
        hospitalisedOnly: true,
        carePlanListStatus: 'overdue',
        medicalConditionId: 'cond-1',
        carePlanFormIds: ['form-a', 'form-b'],
      },
    })
    expect(params.page).toBe(2)
    expect(params.riskLevelId).toBe('rl-high')
    expect(params.unassignedKeyWorker).toBe(true)
    expect(params.ageMin).toBe(65)
    expect(params.ageMax).toBe(90)
    expect(params.hasActiveFlashMessage).toBe(true)
    expect(params.hospitalisedOnly).toBe(true)
    expect(params.carePlanListStatus).toBe('overdue')
    expect(params.medicalConditionIds).toEqual(['cond-1'])
    expect(params.carePlanFormIds).toEqual(['form-a', 'form-b'])
  })

  it('omits unset advanced filters', () => {
    const params = buildServiceUsersListParams(lookups, {
      page: 1,
      listFilter: null,
      statusFilter: 'ACTIVE',
      onHoldOnly: false,
    })
    expect(params.riskLevelId).toBeUndefined()
    expect(params.hasActiveFlashMessage).toBeUndefined()
    expect(params.hospitalisedOnly).toBeUndefined()
    expect(params.carePlanListStatus).toBeUndefined()
    expect(params.carePlanFormIds).toBeUndefined()
    expect(params.medicalConditionIds).toBeUndefined()
  })
})

describe('riskLevelIdForCode', () => {
  it('resolves lookup id', () => {
    expect(riskLevelIdForCode(lookups, 'LOW')).toBe('rl-low')
    expect(riskLevelIdForCode(lookups, null)).toBeUndefined()
  })
})

describe('advancedFilterRangeErrors', () => {
  it('flags inverted age range', () => {
    expect(advancedFilterRangeErrors({ ageMin: 90, ageMax: 50 }).age).toMatch(/Age from/)
  })

  it('allows equal and open-ended age ranges', () => {
    expect(advancedFilterRangeErrors({ ageMin: 50, ageMax: 90 })).toEqual({})
    expect(advancedFilterRangeErrors({ ageMin: 65, ageMax: 65 })).toEqual({})
    expect(advancedFilterRangeErrors({ ageMin: 90 })).toEqual({})
    expect(advancedFilterRangeErrors({ ageMax: 50 })).toEqual({})
  })

  it('flags inverted date ranges', () => {
    expect(
      advancedFilterRangeErrors({ dateOfDeathFrom: '2026-09-11', dateOfDeathTo: '2026-01-01' })
        .dateOfDeath,
    ).toBeTruthy()
    expect(
      advancedFilterRangeErrors({ missedVisitsFrom: '2026-09-11', missedVisitsTo: '2026-09-01' })
        .missedVisits,
    ).toBeTruthy()
    expect(
      advancedFilterRangeErrors({ dateOfDeathFrom: '2026-01-01', dateOfDeathTo: '2026-09-11' }),
    ).toEqual({})
  })
})

describe('countActiveAdvancedFilters', () => {
  it('counts set filters', () => {
    expect(
      countActiveAdvancedFilters({
        ageMin: 1,
        ageMax: undefined,
        hasActiveFlashMessage: true,
        hospitalisedOnly: false,
        carePlanListStatus: '',
        medicalConditionId: undefined,
      }),
    ).toBe(2)
  })

  it('counts per group from the same chip state', () => {
    const filters = {
      ageMin: 65,
      ageMax: 90,
      dateOfDeathFrom: '2026-01-01',
      carePlanListStatus: 'overdue' as const,
      medicalConditionId: 'c1',
      missedVisitsMin: 2,
      hasActiveFlashMessage: true,
      loneWorkerRisk: true,
      verbalAltercation: true,
    }
    expect(countAdvancedFiltersInGroup(filters, 'profile')).toBe(2)
    expect(countAdvancedFiltersInGroup(filters, 'clinical')).toBe(2)
    expect(countAdvancedFiltersInGroup(filters, 'visits')).toBe(1)
    expect(countAdvancedFiltersInGroup(filters, 'alerts')).toBe(1)
    expect(countAdvancedFiltersInGroup(filters, 'safety')).toBe(2)
    expect(
      countAdvancedFiltersInGroup(filters, 'profile') +
        countAdvancedFiltersInGroup(filters, 'clinical') +
        countAdvancedFiltersInGroup(filters, 'visits') +
        countAdvancedFiltersInGroup(filters, 'alerts') +
        countAdvancedFiltersInGroup(filters, 'safety'),
    ).toBe(countActiveAdvancedFilters(filters))
  })
})

describe('describeAdvancedFilterChips / clearAdvancedFilterChip', () => {
  it('builds removable chips including age range and condition label', () => {
    const chips = describeAdvancedFilterChips({
      ageMin: 65,
      ageMax: 90,
      hasActiveFlashMessage: true,
      hospitalisedOnly: false,
      carePlanListStatus: 'overdue',
      medicalConditionIds: ['c1', 'c2', 'c3'],
      medicalConditionLabels: { c1: 'Diabetes', c2: 'Dementia', c3: 'COPD' },
      carePlanFormIds: ['f1', 'f2', 'f3'],
      carePlanFormLabels: { f1: 'Falls', f2: 'Dementia', f3: 'Medication' },
      initialAssessmentStatus: 'awaiting_review',
      missedVisitsMin: 3,
      loneWorkerRisk: true,
      verbalAltercation: true,
    })
    expect(chips.map((c) => c.label)).toEqual([
      'Age 65–90',
      'Care plan review overdue',
      'Falls, Dementia +1',
      'Diabetes, Dementia +1',
      'IA awaiting review',
      'Missed visits ≥ 3',
      'Active flash alert',
      'Lone worker risk',
      'Verbal altercation',
    ])
    const clearedAge = clearAdvancedFilterChip(
      {
        ageMin: 65,
        ageMax: 90,
        hasActiveFlashMessage: true,
        hospitalisedOnly: false,
        carePlanListStatus: 'overdue',
        medicalConditionId: 'c1',
        medicalConditionLabel: 'Diabetes',
        carePlanFormIds: ['f1'],
        carePlanFormLabels: { f1: 'Falls' },
      },
      'age',
    )
    expect(clearedAge.ageMin).toBeUndefined()
    expect(clearedAge.ageMax).toBeUndefined()
    expect(clearedAge.carePlanListStatus).toBe('overdue')
    const clearedPlans = clearAdvancedFilterChip(clearedAge, 'carePlanFormIds')
    expect(clearedPlans.carePlanFormIds).toEqual([])
    expect(clearedPlans.carePlanFormLabels).toEqual({})
    const clearedConditions = clearAdvancedFilterChip(
      {
        ...clearedPlans,
        medicalConditionIds: ['c1'],
        medicalConditionLabels: { c1: 'Diabetes' },
      },
      'medicalConditionIds',
    )
    expect(clearedConditions.medicalConditionIds).toEqual([])
    expect(clearedConditions.medicalConditionLabels).toEqual({})
  })
})
