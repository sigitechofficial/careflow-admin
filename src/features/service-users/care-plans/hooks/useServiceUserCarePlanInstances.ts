import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchCarePlanCompose,
  fetchCarePlanInstance,
  fetchCarePlanInstances,
  publishCarePlanApi,
  saveCarePlanDraftApi,
} from '@/features/service-users/care-plans/api'
import type { CarePlanComposeGap } from '@/features/service-users/care-plans/types'
import { serviceUserKeys } from '@/features/service-users/keys'

const STALE_TIME = 30_000

export type SaveCarePlanDraftPayload = {
  values: Record<string, string | boolean>
  composedFrom?: Record<string, unknown>
  gaps?: CarePlanComposeGap[]
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.carePlan(serviceUserId) })
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
