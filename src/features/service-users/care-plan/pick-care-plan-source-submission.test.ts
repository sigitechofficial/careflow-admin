import { describe, expect, it } from 'vitest'
import type { InitialAssessmentSubmission } from '@/features/service-users/initial-assessment/types'
import { pickCarePlanSourceSubmission } from './pick-care-plan-source-submission'

function sub(
  id: string,
  status: InitialAssessmentSubmission['status'],
  updatedAt: string,
): InitialAssessmentSubmission {
  return {
    id,
    serviceUserId: 'su-1',
    templateId: 't-1',
    status,
    startedAt: null,
    completedAt: null,
    submittedAt: null,
    reviewedAt: null,
    reviewNotes: null,
    overallNotes: null,
    createdAt: updatedAt,
    updatedAt,
  }
}

describe('pickCarePlanSourceSubmission', () => {
  it('returns null for an empty list', () => {
    expect(pickCarePlanSourceSubmission([])).toBeNull()
  })

  it('prefers reviewed over a newer draft', () => {
    const picked = pickCarePlanSourceSubmission([
      sub('draft', 'DRAFT', '2026-08-19T12:00:00.000Z'),
      sub('reviewed', 'REVIEWED', '2026-08-01T12:00:00.000Z'),
    ])
    expect(picked?.id).toBe('reviewed')
  })

  it('prefers submitted over in-progress', () => {
    const picked = pickCarePlanSourceSubmission([
      sub('progress', 'IN_PROGRESS', '2026-08-19T12:00:00.000Z'),
      sub('submitted', 'SUBMITTED', '2026-08-01T12:00:00.000Z'),
    ])
    expect(picked?.id).toBe('submitted')
  })

  it('uses the latest updated when status matches', () => {
    const picked = pickCarePlanSourceSubmission([
      sub('old', 'REVIEWED', '2026-08-01T12:00:00.000Z'),
      sub('new', 'REVIEWED', '2026-08-18T12:00:00.000Z'),
    ])
    expect(picked?.id).toBe('new')
  })
})
