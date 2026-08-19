import * as React from 'react'
import {
  useInitialAssessmentAnswers,
  useInitialAssessmentSubmissions,
} from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import { useMedicationRounds } from '@/features/settings/hooks/useMedicationRounds'
import { resolveIaPreferredVisitTimesFromAnswers } from '@/features/service-users/visit-plan/resolve-ia-preferred-visit-times'

export function useIaPreferredVisitTimes(serviceUserId: string, enabled = true) {
  const submissionsQuery = useInitialAssessmentSubmissions(serviceUserId, enabled && Boolean(serviceUserId))
  const latestSubmissionId = submissionsQuery.data?.[0]?.id ?? null
  const answersQuery = useInitialAssessmentAnswers(
    serviceUserId,
    latestSubmissionId,
    enabled && Boolean(serviceUserId && latestSubmissionId),
  )
  const medicationRoundsQuery = useMedicationRounds()

  const summary = React.useMemo(
    () =>
      resolveIaPreferredVisitTimesFromAnswers(
        answersQuery.data ?? [],
        medicationRoundsQuery.data ?? [],
      ),
    [answersQuery.data, medicationRoundsQuery.data],
  )

  return {
    isLoading:
      submissionsQuery.isLoading ||
      (Boolean(latestSubmissionId) && answersQuery.isLoading) ||
      medicationRoundsQuery.isLoading,
    hasSubmission: Boolean(latestSubmissionId),
    hasAnswer: summary?.hasAnswer ?? false,
    summaryText: summary?.summaryText ?? '',
    selectedSlots: summary?.selectedSlots ?? [],
    submissionId: latestSubmissionId,
  }
}
