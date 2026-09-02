import { describe, expect, it } from 'vitest'
import {
  isEditableInitialAssessmentStatus,
  pickSubmissionFromList,
  resolveInitialAssessmentSubmissionId,
} from '@/features/service-users/initial-assessment/utils/resolve-initial-assessment-submission-id.util'
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

  it('prefers editable submission over submitted when the URL does not pin one', () => {
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

  it('keeps a URL submission id even when the list has not loaded it yet (new reassessment race)', () => {
    const submissions = [row('old', 'SUBMITTED')]
    expect(resolveInitialAssessmentSubmissionId(submissions, 'new-draft')).toBe('new-draft')
  })

  it('keeps an explicit URL pin on the original submitted assessment when that row exists', () => {
    const submissions = [row('old', 'SUBMITTED'), row('active', 'DRAFT')]
    expect(resolveInitialAssessmentSubmissionId(submissions, 'old')).toBe('old')
  })
})

describe('pickSubmissionFromList', () => {
  it('returns the matching row', () => {
    const submissions = [row('old', 'SUBMITTED'), row('active', 'DRAFT')]
    expect(pickSubmissionFromList(submissions, 'active')?.status).toBe('DRAFT')
  })

  it('does not fall back to a submitted row when the target id is missing', () => {
    const submissions = [row('old', 'SUBMITTED')]
    expect(pickSubmissionFromList(submissions, 'new-draft')).toBeUndefined()
  })

  it('falls back to the first row only when no id is requested', () => {
    const submissions = [row('only', 'SUBMITTED')]
    expect(pickSubmissionFromList(submissions, null)?.id).toBe('only')
  })
})

describe('isEditableInitialAssessmentStatus', () => {
  it('DRAFT and IN_PROGRESS are editable; SUBMITTED and REVIEWED are not', () => {
    expect(isEditableInitialAssessmentStatus('DRAFT')).toBe(true)
    expect(isEditableInitialAssessmentStatus('IN_PROGRESS')).toBe(true)
    expect(isEditableInitialAssessmentStatus('SUBMITTED')).toBe(false)
    expect(isEditableInitialAssessmentStatus('REVIEWED')).toBe(false)
  })
})
