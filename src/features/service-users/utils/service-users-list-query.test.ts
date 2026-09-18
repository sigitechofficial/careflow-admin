import { describe, expect, it } from 'vitest'
import type { ServiceUserLookupsBundle } from '@/features/service-users/types'
import {
  buildServiceUsersListParams,
  clearAdvancedFilterChip,
  countActiveAdvancedFilters,
  countAdvancedFiltersInGroup,
  advancedFilterRangeErrors,
  describeAdvancedFilterChips,
  formatDateOfDeathFilterChip,
  riskLevelIdForCode,
  toDateOfDeathApiParam,
  toDateOfDeathInputValue,
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
        careTypeId: 'ct-dom',
        fundingTypeId: 'ft-la',
        serviceStartDateFrom: '2026-01-01',
        serviceStartDateTo: '2026-03-31',
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
    expect(params.careTypeId).toBe('ct-dom')
    expect(params.fundingTypeId).toBe('ft-la')
    expect(params.serviceStartDateFrom).toBe('2026-01-01')
    expect(params.serviceStartDateTo).toBe('2026-03-31')
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
    expect(params.careTypeId).toBeUndefined()
    expect(params.fundingTypeId).toBeUndefined()
    expect(params.serviceStartDateFrom).toBeUndefined()
    expect(params.serviceStartDateTo).toBeUndefined()
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

  it('flags inverted service start range', () => {
    expect(
      advancedFilterRangeErrors({
        serviceStartDateFrom: '2026-09-11',
        serviceStartDateTo: '2026-01-01',
      }).serviceStartDate,
    ).toMatch(/Service start from/)
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

  it('flags inverted date-of-death datetimes', () => {
    expect(
      advancedFilterRangeErrors({
        dateOfDeathFrom: '2026-01-01T15:00',
        dateOfDeathTo: '2026-01-01T09:00',
      }).dateOfDeath,
    ).toBeTruthy()
    expect(
      advancedFilterRangeErrors({
        dateOfDeathFrom: '2026-01-01T09:00',
        dateOfDeathTo: '2026-01-01T15:00',
      }),
    ).toEqual({})
  })
})

describe('date of death datetime helpers', () => {
  it('normalises datetime-local to API ISO', () => {
    expect(toDateOfDeathApiParam('2026-03-15')).toBe('2026-03-15')
    expect(toDateOfDeathApiParam('2026-03-15T14:30')).toBe('2026-03-15T14:30:00.000Z')
    expect(toDateOfDeathApiParam('2026-03-15T14:30:00.000Z')).toBe('2026-03-15T14:30:00.000Z')
  })

  it('maps stored values into datetime-local inputs', () => {
    expect(toDateOfDeathInputValue('2026-03-15')).toBe('2026-03-15T00:00')
    expect(toDateOfDeathInputValue('2026-03-15T14:30:00.000Z')).toBe('2026-03-15T14:30')
  })

  it('formats chips with time when present', () => {
    expect(formatDateOfDeathFilterChip('2026-03-15')).toBe('2026-03-15')
    expect(formatDateOfDeathFilterChip('2026-03-15T14:30')).toBe('2026-03-15 14:30')
  })
})

describe('date of death API mapping', () => {
  it('sends ISO datetime params from advanced filters', () => {
    const params = buildServiceUsersListParams(lookups, {
      page: 1,
      listFilter: null,
      statusFilter: 'ACTIVE',
      onHoldOnly: false,
      riskLevelCode: null,
      advanced: {
        dateOfDeathFrom: '2026-03-15T09:00',
        dateOfDeathTo: '2026-03-15T17:30',
      },
    })
    expect(params.dateOfDeathFrom).toBe('2026-03-15T09:00:00.000Z')
    expect(params.dateOfDeathTo).toBe('2026-03-15T17:30:00.000Z')
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
      careTypeId: 'ct-1',
      careTypeLabel: 'Domiciliary',
      serviceStartDateFrom: '2026-02-01',
      carePlanListStatus: 'overdue' as const,
      medicalConditionId: 'c1',
      missedVisitsMin: 2,
      hasActiveFlashMessage: true,
      loneWorkerRisk: true,
      verbalAltercation: true,
    }
    expect(countAdvancedFiltersInGroup(filters, 'profile')).toBe(4)
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
      careTypeId: 'ct-dom',
      careTypeLabel: 'Domiciliary',
      fundingTypeId: 'ft-la',
      fundingTypeLabel: 'Local authority',
      serviceStartDateFrom: '2026-01-01',
      serviceStartDateTo: '2026-03-31',
    })
    expect(chips.map((c) => c.label)).toEqual([
      'Age 65–90',
      'Care type: Domiciliary',
      'Funding: Local authority',
      'Service start 2026-01-01 → 2026-03-31',
      'Care plan review overdue',
      'Falls, Dementia +1',
      'Diabetes, Dementia +1',
      'IA awaiting review',
      'Missed visits > 3',
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
        careTypeId: 'ct-dom',
        careTypeLabel: 'Domiciliary',
        serviceStartDateFrom: '2026-01-01',
        serviceStartDateTo: '2026-03-31',
      },
      'age',
    )
    expect(clearedAge.ageMin).toBeUndefined()
    expect(clearedAge.ageMax).toBeUndefined()
    expect(clearedAge.carePlanListStatus).toBe('overdue')
    expect(clearedAge.careTypeId).toBe('ct-dom')
    expect(clearedAge.serviceStartDateFrom).toBe('2026-01-01')
    const clearedStart = clearAdvancedFilterChip(clearedAge, 'serviceStartDate')
    expect(clearedStart.serviceStartDateFrom).toBeUndefined()
    expect(clearedStart.serviceStartDateTo).toBeUndefined()
    const clearedCareType = clearAdvancedFilterChip(clearedStart, 'careTypeId')
    expect(clearedCareType.careTypeId).toBeUndefined()
    expect(clearedCareType.careTypeLabel).toBeUndefined()
    const clearedPlans = clearAdvancedFilterChip(clearedCareType, 'carePlanFormIds')
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
