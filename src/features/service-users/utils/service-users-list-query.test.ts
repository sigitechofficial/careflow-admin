import { describe, expect, it } from 'vitest'
import type { ServiceUserLookupsBundle } from '@/features/service-users/types'
import {
  buildServiceUsersListParams,
  clearAdvancedFilterChip,
  countActiveAdvancedFilters,
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
    expect(params.medicalConditionId).toBe('cond-1')
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
  })
})

describe('riskLevelIdForCode', () => {
  it('resolves lookup id', () => {
    expect(riskLevelIdForCode(lookups, 'LOW')).toBe('rl-low')
    expect(riskLevelIdForCode(lookups, null)).toBeUndefined()
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
})

describe('describeAdvancedFilterChips / clearAdvancedFilterChip', () => {
  it('builds removable chips including age range and condition label', () => {
    const chips = describeAdvancedFilterChips({
      ageMin: 65,
      ageMax: 90,
      hasActiveFlashMessage: true,
      hospitalisedOnly: false,
      carePlanListStatus: 'overdue',
      medicalConditionId: 'c1',
      medicalConditionLabel: 'Diabetes',
      initialAssessmentStatus: 'awaiting_review',
      missedVisitsMin: 3,
      loneWorkerRisk: true,
      verbalAltercation: true,
    })
    expect(chips.map((c) => c.label)).toEqual([
      'Age 65–90',
      'Care plan review overdue',
      'Diabetes',
      'IA awaiting review',
      'Missed visits ≥ 3',
      'Active flash alert',
      'Lone worker risk',
      'Verbal altercation',
    ])
    const cleared = clearAdvancedFilterChip(
      {
        ageMin: 65,
        ageMax: 90,
        hasActiveFlashMessage: true,
        hospitalisedOnly: false,
        carePlanListStatus: 'overdue',
        medicalConditionId: 'c1',
        medicalConditionLabel: 'Diabetes',
      },
      'age',
    )
    expect(cleared.ageMin).toBeUndefined()
    expect(cleared.ageMax).toBeUndefined()
    expect(cleared.carePlanListStatus).toBe('overdue')
  })
})
