import type {
  InitialAssessmentStatus,
  InitialAssessmentSubmission,
} from '@/features/service-users/initial-assessment/types'

const STATUS_RANK: Record<InitialAssessmentStatus, number> = {
  REVIEWED: 0,
  SUBMITTED: 1,
  IN_PROGRESS: 2,
  DRAFT: 3,
  ARCHIVED: 4,
  CANCELLED: 5,
}

/** Prefer a reviewed/submitted IA; fall back to the most recently updated draft. */
export function pickCarePlanSourceSubmission(
  submissions: InitialAssessmentSubmission[],
): InitialAssessmentSubmission | null {
  if (submissions.length === 0) return null
  return [...submissions].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
    if (rank !== 0) return rank
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })[0]
}
