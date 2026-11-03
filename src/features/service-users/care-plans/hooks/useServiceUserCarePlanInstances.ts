import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchCarePlanCompose,
  fetchCarePlanInstance,
  fetchCarePlanInstances,
  fetchCarePlanVersion,
  approveCarePlanDraftApi,
  changeCarePlanLifecycleApi,
  changeCarePlanRisksApi,
  changeCarePlanTaskReconciliationApi,
  fetchCarePlanRisks,
  fetchCarePlanTaskReconciliation,
  publishCarePlanApi,
  requestCarePlanChangesApi,
  saveCarePlanDraftApi,
  submitCarePlanForApprovalApi,
} from '@/features/service-users/care-plans/api'
import type { CarePlanComposeGap, CarePlanInstance, CarePlanReviewSummary } from '@/features/service-users/care-plans/types'
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
    select: (payload) => payload.instances,
  })
}

export function useCarePlanReviewSummary(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: [...serviceUserKeys.carePlan(serviceUserId), 'instances'] as const,
    queryFn: ({ signal }) => fetchCarePlanInstances(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
    staleTime: STALE_TIME,
    select: (payload) => payload.reviewSummary,
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
      void qc.invalidateQueries({ queryKey: serviceUserKeys.lists() })
    },
  })
}

export function usePublishCarePlan(serviceUserId: string, formId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload?: { summary?: string; gapAcknowledged?: boolean; incidentActionId?: string }) =>
      publishCarePlanApi(serviceUserId, formId, payload),
    onSuccess: async (published) => {
      if (published) {
        qc.setQueryData(
          [...serviceUserKeys.carePlan(serviceUserId), 'instance', formId] as const,
          published,
        )
        qc.setQueryData(
          [...serviceUserKeys.carePlan(serviceUserId), 'instances'] as const,
          (
            prev:
              | { instances: CarePlanInstance[]; reviewSummary: CarePlanReviewSummary | null }
              | CarePlanInstance[]
              | undefined,
          ) => {
            if (Array.isArray(prev)) return upsertCarePlanInstanceInList(prev, published)
            return {
              instances: upsertCarePlanInstanceInList(prev?.instances, published),
              reviewSummary: prev?.reviewSummary ?? null,
            }
          },
        )
      }
      // Instances list (Live) + IA recommendations / accepted care plans on overview.
      await Promise.all([
        qc.invalidateQueries({ queryKey: serviceUserKeys.carePlan(serviceUserId) }),
        qc.invalidateQueries({ queryKey: initialAssessmentKeys.submissions(serviceUserId) }),
        qc.invalidateQueries({ queryKey: serviceUserKeys.lists() }),
      ])
    },
  })
}

/** Submit / Approve / Request changes on the working draft. */
export function useCarePlanApprovalActions(serviceUserId: string, formId: string) {
  const qc = useQueryClient()
  const onSuccess = () => qc.invalidateQueries({ queryKey: serviceUserKeys.carePlan(serviceUserId) })
  return {
    submit: useMutation({ mutationFn: () => submitCarePlanForApprovalApi(serviceUserId, formId), onSuccess }),
    approve: useMutation({
      mutationFn: (contentHash: string) => approveCarePlanDraftApi(serviceUserId, formId, contentHash),
      onSuccess,
    }),
    requestChanges: useMutation({
      mutationFn: (reason: string) => requestCarePlanChangesApi(serviceUserId, formId, reason),
      onSuccess,
    }),
  }
}

export function useCarePlanLifecycleAction(serviceUserId: string, formId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      action: 'suspend' | 'resume' | 'archive'
      reason: string
      reviewConfirmed?: boolean
    }) =>
      changeCarePlanLifecycleApi(serviceUserId, formId, input.action, {
        reason: input.reason,
        ...(input.reviewConfirmed !== undefined ? { reviewConfirmed: input.reviewConfirmed } : {}),
      }),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: serviceUserKeys.carePlan(serviceUserId) }),
        qc.invalidateQueries({ queryKey: serviceUserKeys.lists() }),
      ]),
  })
}

export function useCarePlanTaskReconciliation(serviceUserId: string, formId: string, enabled = true) {
  return useQuery({
    queryKey: [...serviceUserKeys.carePlan(serviceUserId), 'task-reconciliation', formId] as const,
    queryFn: ({ signal }) => fetchCarePlanTaskReconciliation(serviceUserId, formId, { signal }),
    enabled: enabled && Boolean(serviceUserId) && Boolean(formId),
    staleTime: STALE_TIME,
  })
}

export function useCarePlanTaskReconciliationAction(serviceUserId: string, formId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof changeCarePlanTaskReconciliationApi>[2]) =>
      changeCarePlanTaskReconciliationApi(serviceUserId, formId, input),
    onSuccess: (data) =>
      qc.setQueryData([...serviceUserKeys.carePlan(serviceUserId), 'task-reconciliation', formId] as const, data),
  })
}

export function useCarePlanRisks(serviceUserId: string, formId: string, enabled = true) {
  return useQuery({
    queryKey: [...serviceUserKeys.carePlan(serviceUserId), 'risks', formId] as const,
    queryFn: ({ signal }) => fetchCarePlanRisks(serviceUserId, formId, { signal }),
    enabled: enabled && Boolean(serviceUserId) && Boolean(formId),
    staleTime: STALE_TIME,
  })
}

export function useCarePlanRisksAction(serviceUserId: string, formId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof changeCarePlanRisksApi>[2]) => changeCarePlanRisksApi(serviceUserId, formId, input),
    onSuccess: async (data) => {
      qc.setQueryData([...serviceUserKeys.carePlan(serviceUserId), 'risks', formId] as const, data)
      await qc.invalidateQueries({ queryKey: [...serviceUserKeys.carePlan(serviceUserId), 'instance', formId] })
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
