import { describe, expect, it } from 'vitest'
import type { VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'
import { mergeBulkCarerCandidates } from './schedule-bulk-carer-suggest.util'

function carer(employeeId: string, patch: Partial<VisitPlanCarerCandidate> = {}): VisitPlanCarerCandidate {
  return {
    employeeId,
    displayName: employeeId,
    role: 'Carer',
    jobTitle: null,
    fit: 'good',
    isPreferred: false,
    isBlocked: false,
    availability: { availableDays: [4], unavailableDays: [], timeWindowOk: true, summary: '' },
    skills: { matched: [], missing: [] },
    complianceIssues: 0,
    allowedWeeklyHours: 37.5,
    assignedWeeklyHours: 30,
    projectedWeeklyHours: 31,
    warnings: [],
    ...patch,
  }
}

describe('mergeBulkCarerCandidates', () => {
  it('keeps only carers suggested for every visit', () => {
    const merged = mergeBulkCarerCandidates([
      [carer('emma'), carer('amelia')],
      [carer('emma')],
    ])
    expect(merged.map((c) => c.employeeId)).toEqual(['emma'])
  })

  it('takes the weakest match and any block or clash', () => {
    const [emma] = mergeBulkCarerCandidates([
      [carer('emma', { fit: 'good', isPreferred: true })],
      [carer('emma', { fit: 'partial', hasRotaConflict: true, isPreferred: false })],
    ])
    expect(emma?.fit).toBe('partial')
    expect(emma?.hasRotaConflict).toBe(true)
    expect(emma?.isPreferred).toBe(false)
  })

  it('adds the visits’ hours together for the week', () => {
    const [emma] = mergeBulkCarerCandidates([
      [carer('emma', { assignedWeeklyHours: 36, projectedWeeklyHours: 37 })],
      [carer('emma', { assignedWeeklyHours: 36, projectedWeeklyHours: 37 })],
    ])
    expect(emma?.projectedWeeklyHours).toBe(38)
    expect(emma?.exceedsContractedHours).toBe(true)
  })
})
