import { describe, expect, it } from 'vitest'
import { resolveInitialAssessmentSubmissionId } from '@/features/service-users/initial-assessment/utils/resolve-initial-assessment-submission-id.util'
import type { InitialAssessmentSubmission } from '@/features/service-users/initial-assessment/types'

function row(
  id: string,
  status: InitialAssessmentSubmission['status'],
): InitialAssessmentSubmission {
  return {
    id,
    serviceUserId: 'su-1',
    templateId: 'tpl-1',
    status,
    startedAt: null,
    completedAt: null,
    submittedAt: null,
    reviewedAt: null,
    reviewNotes: null,
    overallNotes: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

describe('resolveInitialAssessmentSubmissionId', () => {
  it('prefers URL submission when present in list', () => {
    const submissions = [row('a', 'DRAFT'), row('b', 'IN_PROGRESS')]
    expect(resolveInitialAssessmentSubmissionId(submissions, 'b')).toBe('b')
  })

  it('prefers editable submission over submitted', () => {
    const submissions = [row('old', 'SUBMITTED'), row('active', 'IN_PROGRESS')]
    expect(resolveInitialAssessmentSubmissionId(submissions)).toBe('active')
  })

  it('falls back to first submission', () => {
    const submissions = [row('only', 'SUBMITTED')]
    expect(resolveInitialAssessmentSubmissionId(submissions)).toBe('only')
  })

  it('returns null for empty list', () => {
    expect(resolveInitialAssessmentSubmissionId([])).toBeNull()
    expect(resolveInitialAssessmentSubmissionId(undefined)).toBeNull()
  })
})
