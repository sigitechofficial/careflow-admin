import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchCarePlanCompose,
  fetchCarePlanInstance,
  fetchCarePlanInstances,
  fetchCarePlanVersion,
  publishCarePlanApi,
  saveCarePlanDraftApi,
} from '@/features/service-users/care-plans/api'
import type { CarePlanComposeGap, CarePlanInstance } from '@/features/service-users/care-plans/types'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import { serviceUserKeys } from '@/features/service-users/keys'

const STALE_TIME = 30_000

export type SaveCarePlanDraftPayload = {
  values: Record<string, string | boolean>
  composedFrom?: Record<string, unknown>
  gaps?: CarePlanComposeGap[]
}

/** Keep Live Care Plans list in sync immediately after publish (before refetch settles). */
export function upsertCarePlanInstanceInList(
  prev: CarePlanInstance[] | undefined,
  next: CarePlanInstance,
): CarePlanInstance[] {
  if (!prev?.length) return [next]
  const idx = prev.findIndex(
    (row) => row.id === next.id || row.carePathwayFormId === next.carePathwayFormId,
  )
  if (idx < 0) return [...prev, next]
  const copy = [...prev]
  copy[idx] = next
  return copy
}

export function useCarePlanInstances(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: [...serviceUserKeys.carePlan(serviceUserId), 'instances'] as const,
    queryFn: ({ signal }) => fetchCarePlanInstances(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
    staleTime: STALE_TIME,
  })
}

export function useCarePlanInstance(
  serviceUserId: string,
  formId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: [...serviceUserKeys.carePlan(serviceUserId), 'instance', formId] as const,
    queryFn: ({ signal }) => fetchCarePlanInstance(serviceUserId, formId, { signal }),
    enabled: enabled && Boolean(serviceUserId) && Boolean(formId),
    staleTime: STALE_TIME,
  })
}

export function useCarePlanPublishedVersion(
  serviceUserId: string,
  formId: string,
  versionId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: [...serviceUserKeys.carePlan(serviceUserId), 'version', formId, versionId] as const,
    queryFn: ({ signal }) => fetchCarePlanVersion(serviceUserId, formId, versionId!, { signal }),
    enabled: enabled && Boolean(serviceUserId) && Boolean(formId) && Boolean(versionId),
    staleTime: STALE_TIME,
  })
}

export function useSaveCarePlanDraft(serviceUserId: string, formId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SaveCarePlanDraftPayload) =>
      saveCarePlanDraftApi(serviceUserId, formId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.carePlan(serviceUserId) })
    },
  })
}

export function usePublishCarePlan(serviceUserId: string, formId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload?: { summary?: string; gapAcknowledged?: boolean }) =>
      publishCarePlanApi(serviceUserId, formId, payload),
    onSuccess: async (published) => {
      if (published) {
        qc.setQueryData(
          [...serviceUserKeys.carePlan(serviceUserId), 'instance', formId] as const,
          published,
        )
        qc.setQueryData(
          [...serviceUserKeys.carePlan(serviceUserId), 'instances'] as const,
          (prev: CarePlanInstance[] | undefined) =>
            upsertCarePlanInstanceInList(prev, published),
        )
      }
      // Instances list (Live) + IA recommendations / accepted care plans on overview.
      await Promise.all([
        qc.invalidateQueries({ queryKey: serviceUserKeys.carePlan(serviceUserId) }),
        qc.invalidateQueries({ queryKey: initialAssessmentKeys.submissions(serviceUserId) }),
      ])
    },
  })
}

export function useCarePlanCompose(serviceUserId: string, formId: string, enabled = true) {
  return useQuery({
    queryKey: [...serviceUserKeys.carePlan(serviceUserId), 'compose', formId] as const,
    queryFn: ({ signal }) => fetchCarePlanCompose(serviceUserId, formId, { signal }),
    enabled: enabled && Boolean(serviceUserId) && Boolean(formId),
    staleTime: 0,
  })
}

export function mergeComposedValues(
  current: Record<string, string | boolean>,
  composed: Record<string, string | boolean>,
  mode: 'empty_only' | 'overwrite',
): Record<string, string | boolean> {
  if (mode === 'overwrite') return { ...current, ...composed }
  const next = { ...current }
  for (const [key, value] of Object.entries(composed)) {
    const existing = next[key]
    if (existing == null || existing === '') {
      next[key] = value
    }
  }
  return next
}
