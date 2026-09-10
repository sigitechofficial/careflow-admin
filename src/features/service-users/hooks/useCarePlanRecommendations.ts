import * as React from 'react'
import { useMedicalConditionCarePlanRecommendations } from '@/features/alerts/hooks/useMedicalClinical'
import { mergeCarePlanRecommendations } from '@/features/service-users/care-plan/merge-care-plan-recommendations'
import { useCarePlanIaSource } from '@/features/service-users/hooks/useCarePlanIaSource'
import type { CarePlanRecommendation } from '@/features/service-users/initial-assessment/types'

/**
 * Care Plan recommendations from Initial Assessment and/or medical conditions.
 * Works when there is no IA yet (e.g. High Risk of Falls → Falls plan).
 */
export function useCarePlanRecommendations(serviceUserId: string) {
  const ia = useCarePlanIaSource(serviceUserId)
  const conditionQuery = useMedicalConditionCarePlanRecommendations(
    serviceUserId,
    ia.canRead && Boolean(serviceUserId),
  )

  const recommendations: CarePlanRecommendation[] = React.useMemo(() => {
    const fromIa = ia.summaryQuery.data?.carePlanRecommendations ?? []
    const fromConditions = (conditionQuery.data ?? []) as CarePlanRecommendation[]
    return mergeCarePlanRecommendations(fromIa, fromConditions)
  }, [ia.summaryQuery.data?.carePlanRecommendations, conditionQuery.data])

  const isLoading =
    ia.submissionsQuery.isLoading ||
    (Boolean(ia.submission) && ia.summaryQuery.isLoading) ||
    conditionQuery.isLoading

  return {
    ...ia,
    conditionQuery,
    recommendations,
    isLoading,
  }
}
