import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { fetchInitialAssessmentSummary } from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import { fetchCarePlanInstances } from '@/features/service-users/care-plans/api'
import {
  linkRecommendationsToCarePlans,
  remainingRecommendedCarePlans,
} from '@/features/service-users/care-plans/care-plan-ia-return.util'

/**
 * How many of an assessment's recommended care plans are still to do, besides `formId` (read fresh,
 * right after publishing). Refreshes the assessment summary the recommendations tab shows.
 */
export function useRemainingRecommendedCarePlans() {
  const queryClient = useQueryClient()
  return React.useCallback(
    async (serviceUserId: string, submissionId: string, formId: string): Promise<number> => {
      const [summary, carePlans] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: initialAssessmentKeys.summary(serviceUserId, submissionId),
          queryFn: () => fetchInitialAssessmentSummary(serviceUserId, submissionId),
          staleTime: 0,
        }),
        fetchCarePlanInstances(serviceUserId),
      ])
      return remainingRecommendedCarePlans(
        linkRecommendationsToCarePlans(summary.carePlanRecommendations ?? [], carePlans.instances),
        formId,
      )
    },
    [queryClient],
  )
}
