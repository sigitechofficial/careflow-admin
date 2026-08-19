import { useAuthStore } from '@/features/auth/store'
import { pickCarePlanSourceSubmission } from '@/features/service-users/care-plan/pick-care-plan-source-submission'
import {
  useInitialAssessmentSubmissions,
  useInitialAssessmentSummary,
} from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'

export function useCarePlanIaSource(serviceUserId: string) {
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.initial_assessment.read') || can('service_users.read')
  const canUpdate = can('service_users.initial_assessment.update') || can('service_users.update')
  const canReview = can('service_users.initial_assessment.review')
  const canCreateCarePlan = can('service_users.update')

  const submissionsQuery = useInitialAssessmentSubmissions(serviceUserId, canRead && Boolean(serviceUserId))
  const submission = pickCarePlanSourceSubmission(submissionsQuery.data ?? [])
  const summaryQuery = useInitialAssessmentSummary(
    serviceUserId,
    submission?.id ?? null,
    canRead && Boolean(submission?.id),
  )

  return {
    canRead,
    canUpdate,
    canReview,
    canCreateCarePlan,
    submissionsQuery,
    summaryQuery,
    submission,
  }
}
