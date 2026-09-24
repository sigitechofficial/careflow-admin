import { useQueries } from '@tanstack/react-query'
import { fetchAcceptedCarePlans } from '@/features/service-users/initial-assessment/api'
import { listInitialAssessmentSubmissions } from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import {
  buildCarePathwaySteps,
  type VisitPlanCareContextStep,
} from '@/features/service-users/visit-plan/visit-plan-care-plan-links.util'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { InitialAssessmentSubmission } from '@/features/service-users/initial-assessment/types'

function careActivationFromSubmission(submission: InitialAssessmentSubmission | null) {
  if (!submission?.metadata || typeof submission.metadata !== 'object') {
    return { approvedForCareStart: false, careStartConditions: null as string | null }
  }
  const meta = submission.metadata as Record<string, unknown>
  return {
    approvedForCareStart: meta.approvedForCareStart === true,
    careStartConditions:
      typeof meta.careStartConditions === 'string' ? meta.careStartConditions : null,
  }
}

/**
 * The IA lone-worker section can flag that a service user needs a two-carer
 * (double-up) visit. Read from the Environment Assessment snapshot so the visit
 * plan can recommend 2 carers per visit.
 */
function loneWorkerTwoCarerFromSubmission(submission: InitialAssessmentSubmission | null): boolean {
  if (!submission?.metadata || typeof submission.metadata !== 'object') return false
  const meta = submission.metadata as Record<string, unknown>
  const env = meta.environmentAssessment
  if (!env || typeof env !== 'object') return false
  return (env as Record<string, unknown>).twoCarerRecommended === true
}

export function useVisitPlanCareContext(
  serviceUserId: string,
  visitPlanStatus?: string | null,
) {
  const [acceptedQuery, submissionsQuery] = useQueries({
    queries: [
      {
        queryKey: initialAssessmentKeys.acceptedCarePlans(serviceUserId),
        queryFn: () => fetchAcceptedCarePlans(serviceUserId),
        enabled: Boolean(serviceUserId),
        staleTime: 30_000,
      },
      {
        queryKey: initialAssessmentKeys.submissions(serviceUserId),
        queryFn: () => listInitialAssessmentSubmissions(serviceUserId),
        enabled: Boolean(serviceUserId),
        staleTime: 30_000,
      },
    ],
  })

  const acceptedCarePlans: AcceptedCarePlanItem[] = acceptedQuery.data?.items ?? []
  const latestSubmission = (submissionsQuery.data ?? [])[0] ?? null
  const careActivation = careActivationFromSubmission(latestSubmission)
  const loneWorkerTwoCarerRequired = loneWorkerTwoCarerFromSubmission(latestSubmission)

  const pathwaySteps: VisitPlanCareContextStep[] = buildCarePathwaySteps({
    assessmentStatus: latestSubmission?.status ?? null,
    managerReviewed: latestSubmission?.status === 'REVIEWED',
    approvedForCareStart: careActivation?.approvedForCareStart ?? false,
    acceptedCarePlanCount: acceptedCarePlans.length,
    visitPlanStatus: visitPlanStatus ?? null,
  })

  return {
    isLoading: acceptedQuery.isLoading || submissionsQuery.isLoading,
    acceptedCarePlans,
    unresolvedCarePlans: acceptedQuery.data?.unresolved ?? [],
    latestSubmission,
    careActivation,
    loneWorkerTwoCarerRequired,
    pathwaySteps,
  }
}
