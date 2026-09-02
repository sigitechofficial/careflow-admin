import type { InitialAssessmentStatus, InitialAssessmentSubmission } from '@/features/service-users/initial-assessment/types'

const EDITABLE_STATUSES: InitialAssessmentStatus[] = ['DRAFT', 'IN_PROGRESS']

export function isEditableInitialAssessmentStatus(
  status: InitialAssessmentStatus | undefined,
): boolean {
  return status != null && EDITABLE_STATUSES.includes(status)
}

/**
 * Which submission the IA workspace should open.
 *
 * URL id wins so "Start new assessment" can switch onto a newly created DRAFT even while the
 * submissions cache still lists only the previous SUBMITTED/REVIEWED row. Do not fall back to
 * `submissions[0]` in that race — that re-binds the UI to the read-only original.
 */
export function resolveInitialAssessmentSubmissionId(
  submissions: InitialAssessmentSubmission[] | undefined,
  urlSubmissionId?: string | null,
): string | null {
  const fromUrl = urlSubmissionId?.trim()
  if (fromUrl) return fromUrl

  if (!submissions?.length) return null

  const active = submissions.find((row) => isEditableInitialAssessmentStatus(row.status))
  return active?.id ?? submissions[0]?.id ?? null
}

/** Resolve the row for `submissionId`. Never substitute a different submission (e.g. the old submitted one). */
export function pickSubmissionFromList(
  submissions: InitialAssessmentSubmission[] | undefined,
  submissionId: string | null,
): InitialAssessmentSubmission | undefined {
  if (!submissions?.length) return undefined
  if (submissionId) return submissions.find((row) => row.id === submissionId)
  return submissions[0]
}
