import { describe, expect, it } from 'vitest'
import {
  allReadyBulkGenerateRotaCandidatesSelected,
  buildReadyPlanIdSet,
  filterBulkGenerateRotaCandidates,
  toggleAllReadyBulkGenerateRotaPlans,
  toggleBulkGenerateRotaPlanSelection,
} from '@/features/scheduling/utils/bulk-generate-rota-candidates.util'
import type { BulkVisitPlanScheduleCandidate } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'

const sampleRows: BulkVisitPlanScheduleCandidate[] = [
  {
    serviceUserId: 'su-1',
    planId: 'plan-1',
    serviceUserLabel: 'Alice Smith',
    serviceUserNumber: 'SU001',
    locationId: 'loc-1',
    locationName: 'North Branch',
    enabledSlotCount: 2,
    ready: true,
    readinessIssues: [],
  },
  {
    serviceUserId: 'su-2',
    planId: 'plan-2',
    serviceUserLabel: 'Bob Jones',
    serviceUserNumber: 'SU002',
    locationId: null,
    locationName: null,
    enabledSlotCount: 0,
    ready: false,
    readinessIssues: ['No enabled slots'],
  },
]

describe('bulk-generate-rota-candidates.util', () => {
  it('filters candidates by service user label, number, and location', () => {
    expect(filterBulkGenerateRotaCandidates(sampleRows, 'north')).toHaveLength(1)
    expect(filterBulkGenerateRotaCandidates(sampleRows, 'su002')).toHaveLength(1)
    expect(filterBulkGenerateRotaCandidates(sampleRows, '')).toHaveLength(2)
  })

  it('builds ready plan id set from candidates', () => {
    expect([...buildReadyPlanIdSet(sampleRows)]).toEqual(['plan-1'])
  })

  it('tracks all-ready selection state', () => {
    const selected = new Set(['plan-1'])
    const readyRow = sampleRows[0]!
    expect(allReadyBulkGenerateRotaCandidatesSelected([readyRow], selected)).toBe(true)
    expect(allReadyBulkGenerateRotaCandidatesSelected([readyRow], new Set())).toBe(false)
  })

  it('toggles individual and bulk ready plan selection', () => {
    expect(toggleBulkGenerateRotaPlanSelection(new Set(['plan-1']), 'plan-1', true)).toEqual(
      new Set(),
    )
    expect(toggleBulkGenerateRotaPlanSelection(new Set(), 'plan-2', false)).toEqual(new Set())
    expect(
      toggleAllReadyBulkGenerateRotaPlans(new Set(), [sampleRows[0]!], true),
    ).toEqual(new Set(['plan-1']))
  })
})
