import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAssessmentCompletion,
  fetchAssessmentCatalogue,
  fetchAssessmentCompletion,
  fetchAssessmentCompletions,
  fetchCarePlanAssessmentLinks,
  fetchServiceUserAssessments,
  linkAssessmentToCarePlan,
  unlinkAssessmentFromCarePlan,
} from '@/features/service-users/assessments/api'
import { serviceUserAssessmentKeys } from '@/features/service-users/assessments/keys'

const STALE = 30_000

export function useServiceUserAssessments(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserAssessmentKeys.list(serviceUserId),
    queryFn: ({ signal }) => fetchServiceUserAssessments(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
    staleTime: STALE,
  })
}

export function useAssessmentCompletions(
  serviceUserId: string,
  assessmentKey: string,
  enabled = true,
) {
  return useQuery({
    queryKey: serviceUserAssessmentKeys.completions(serviceUserId, assessmentKey),
    queryFn: ({ signal }) => fetchAssessmentCompletions(serviceUserId, assessmentKey, { signal }),
    enabled: enabled && Boolean(serviceUserId && assessmentKey),
    staleTime: STALE,
  })
}

export function useAssessmentCompletion(
  serviceUserId: string,
  completionId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: serviceUserAssessmentKeys.completion(serviceUserId, completionId ?? ''),
    queryFn: ({ signal }) => fetchAssessmentCompletion(serviceUserId, completionId!, { signal }),
    enabled: enabled && Boolean(serviceUserId && completionId),
    staleTime: STALE,
  })
}

export function useAssessmentCatalogue(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserAssessmentKeys.catalogue(serviceUserId),
    queryFn: ({ signal }) => fetchAssessmentCatalogue(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
    staleTime: STALE,
  })
}

export function useCreateAssessmentCompletion(serviceUserId: string, assessmentKey: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof createAssessmentCompletion>[2]) =>
      createAssessmentCompletion(serviceUserId, assessmentKey, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserAssessmentKeys.list(serviceUserId) })
      void qc.invalidateQueries({
        queryKey: serviceUserAssessmentKeys.completions(serviceUserId, assessmentKey),
      })
    },
  })
}

export function useCarePlanAssessmentLinks(
  serviceUserId: string,
  carePlanFormId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: serviceUserAssessmentKeys.carePlanLinks(serviceUserId, carePlanFormId),
    queryFn: ({ signal }) => fetchCarePlanAssessmentLinks(serviceUserId, carePlanFormId, { signal }),
    enabled: enabled && Boolean(serviceUserId && carePlanFormId),
    staleTime: STALE,
  })
}

export function useLinkAssessmentToCarePlan(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      carePlanFormId,
      completionId,
    }: {
      carePlanFormId: string
      completionId: string
    }) => linkAssessmentToCarePlan(serviceUserId, carePlanFormId, completionId),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: serviceUserAssessmentKeys.carePlanLinks(
          serviceUserId,
          variables.carePlanFormId,
        ),
      })
    },
  })
}

export function useUnlinkAssessmentFromCarePlan(serviceUserId: string, carePlanFormId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) => unlinkAssessmentFromCarePlan(serviceUserId, carePlanFormId, linkId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: serviceUserAssessmentKeys.carePlanLinks(serviceUserId, carePlanFormId),
      })
    },
  })
}
