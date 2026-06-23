import type { InitialAssessmentStatus, InitialAssessmentSubmission } from '@/features/service-users/initial-assessment/types'

const EDITABLE_STATUSES: InitialAssessmentStatus[] = ['DRAFT', 'IN_PROGRESS']

export function resolveInitialAssessmentSubmissionId(
  submissions: InitialAssessmentSubmission[] | undefined,
  urlSubmissionId?: string | null,
): string | null {
  if (!submissions?.length) return null

  const fromUrl = urlSubmissionId?.trim()
  if (fromUrl && submissions.some((row) => row.id === fromUrl)) {
    return fromUrl
  }

  const active = submissions.find((row) => EDITABLE_STATUSES.includes(row.status))
  return active?.id ?? submissions[0]?.id ?? null
}
