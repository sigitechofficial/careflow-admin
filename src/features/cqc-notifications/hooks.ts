import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { flattenLocationOptionsFromTree } from '@/features/locations/utils/flatten-location-options.util'
import {
  acknowledgeCqcNotification,
  addCqcNotificationPolicy,
  cancelCqcNotification,
  createCqcNotification,
  fetchCqcNotification,
  fetchCqcNotificationCandidates,
  fetchCqcNotificationPolicies,
  fetchCqcNotificationSummary,
  fetchCqcNotificationTypes,
  fetchCqcNotifications,
  markCqcNotificationNotRequired,
  markCqcNotificationReady,
  removeCqcNotificationPolicy,
  reopenCqcNotification,
  searchCqcNotificationPolicies,
  submitCqcNotification,
  updateCqcNotification,
  type AcknowledgeCqcNotificationInput,
  type CqcNotificationDetail,
  type CqcNotificationFieldsInput,
  type CqcNotificationListParams,
  type CreateCqcNotificationInput,
  type SubmitCqcNotificationInput,
} from './api'

export const cqcNotificationKeys = {
  all: () => ['cqc-notifications'] as const,
  types: () => [...cqcNotificationKeys.all(), 'types'] as const,
  summary: () => [...cqcNotificationKeys.all(), 'summary'] as const,
  candidates: () => [...cqcNotificationKeys.all(), 'candidates'] as const,
  list: (params: CqcNotificationListParams) => [...cqcNotificationKeys.all(), 'list', params] as const,
  detail: (id: string) => [...cqcNotificationKeys.all(), 'detail', id] as const,
  policies: (id: string) => [...cqcNotificationKeys.all(), 'policies', id] as const,
  policySearch: (id: string, q: string) => [...cqcNotificationKeys.all(), 'policy-search', id, q] as const,
}

/** Types, their fields and the internal target (changes only with a release). */
export function useCqcNotificationTypes() {
  return useQuery({
    queryKey: cqcNotificationKeys.types(),
    queryFn: fetchCqcNotificationTypes,
    staleTime: 60 * 60_000,
  })
}

export function useCqcNotificationSummary() {
  return useQuery({ queryKey: cqcNotificationKeys.summary(), queryFn: fetchCqcNotificationSummary })
}

export function useCqcNotifications(params: CqcNotificationListParams, enabled = true) {
  return useQuery({
    queryKey: cqcNotificationKeys.list(params),
    queryFn: () => fetchCqcNotifications(params),
    enabled,
  })
}

/** Incidents and safeguarding cases that may need a notification (last 30 days). */
export function useCqcNotificationCandidates() {
  return useQuery({ queryKey: cqcNotificationKeys.candidates(), queryFn: fetchCqcNotificationCandidates })
}

export function useCqcNotification(id: string) {
  return useQuery({
    queryKey: cqcNotificationKeys.detail(id),
    queryFn: () => fetchCqcNotification(id),
    enabled: Boolean(id),
  })
}

/** Branches the user may choose: their own, or every branch with whole-organisation access. */
export function useCqcBranchOptions(enabled = true) {
  const assignedLocationIds = useAuthStore(s => s.user?.assignedLocationIds)
  const assignedLocations = useAuthStore(s => s.user?.assignedLocations)
  const tree = useLocationManagementTree(enabled && assignedLocationIds == null)
  return React.useMemo(() => {
    if (assignedLocationIds != null) {
      return (assignedLocations ?? []).map(l => ({ id: l.id, label: l.name?.trim() || 'Branch' }))
    }
    return flattenLocationOptionsFromTree(tree.data)
  }, [assignedLocationIds, assignedLocations, tree.data])
}

/** Every write returns the whole notification: seed the detail cache and refresh lists and counts. */
function useOnWrite() {
  const qc = useQueryClient()
  return (detail: CqcNotificationDetail) => {
    qc.setQueryData(cqcNotificationKeys.detail(detail.id), detail)
    void qc.invalidateQueries({ queryKey: [...cqcNotificationKeys.all(), 'list'] })
    void qc.invalidateQueries({ queryKey: cqcNotificationKeys.summary() })
    void qc.invalidateQueries({ queryKey: cqcNotificationKeys.candidates() })
    // Submitting updates the linked safeguarding case and the incident's external bodies.
    if (detail.safeguardingCase || detail.incident) {
      void qc.invalidateQueries({ queryKey: ['safeguarding'] })
      void qc.invalidateQueries({ queryKey: ['incidents'] })
    }
  }
}

export function useCreateCqcNotification() {
  const onWrite = useOnWrite()
  return useMutation({ mutationFn: (body: CreateCqcNotificationInput) => createCqcNotification(body), onSuccess: onWrite })
}

export function useUpdateCqcNotification(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (body: CqcNotificationFieldsInput) => updateCqcNotification(id, body),
    onSuccess: onWrite,
  })
}

export function useMarkCqcNotificationReady(id: string) {
  const onWrite = useOnWrite()
  return useMutation({ mutationFn: () => markCqcNotificationReady(id), onSuccess: onWrite })
}

export function useReopenCqcNotification(id: string) {
  const onWrite = useOnWrite()
  return useMutation({ mutationFn: () => reopenCqcNotification(id), onSuccess: onWrite })
}

export function useSubmitCqcNotification(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (body: SubmitCqcNotificationInput) => submitCqcNotification(id, body),
    onSuccess: onWrite,
  })
}

export function useAcknowledgeCqcNotification(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (body: AcknowledgeCqcNotificationInput) => acknowledgeCqcNotification(id, body),
    onSuccess: onWrite,
  })
}

/** Not required (with reason) or cancelled (with reason). */
export function useCloseCqcNotification(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (v: { as: 'NOT_REQUIRED' | 'CANCELLED'; reason: string }) =>
      v.as === 'CANCELLED' ? cancelCqcNotification(id, v.reason) : markCqcNotificationNotRequired(id, v.reason),
    onSuccess: onWrite,
  })
}

/** Attached, suggested and not-yet-adopted policies for one notification. */
export function useCqcNotificationPolicies(id: string) {
  return useQuery({
    queryKey: cqcNotificationKeys.policies(id),
    queryFn: () => fetchCqcNotificationPolicies(id),
    enabled: Boolean(id),
  })
}

/** Published policies for the notification's branch that can still be attached. */
export function useSearchCqcNotificationPolicies(id: string, q: string, enabled: boolean) {
  return useQuery({
    queryKey: cqcNotificationKeys.policySearch(id, q),
    queryFn: () => searchCqcNotificationPolicies(id, q),
    enabled: enabled && Boolean(id),
  })
}

function useOnPoliciesWrite(id: string) {
  const qc = useQueryClient()
  return (data: Awaited<ReturnType<typeof fetchCqcNotificationPolicies>>) => {
    qc.setQueryData(cqcNotificationKeys.policies(id), data)
    void qc.invalidateQueries({ queryKey: [...cqcNotificationKeys.all(), 'policy-search', id] })
  }
}

export function useAddCqcNotificationPolicy(id: string) {
  const onWrite = useOnPoliciesWrite(id)
  return useMutation({
    mutationFn: (body: { policyDocumentId: string; source: 'SUGGESTED' | 'MANUAL' }) =>
      addCqcNotificationPolicy(id, body),
    onSuccess: onWrite,
  })
}

export function useRemoveCqcNotificationPolicy(id: string) {
  const onWrite = useOnPoliciesWrite(id)
  return useMutation({
    mutationFn: (policyDocumentId: string) => removeCqcNotificationPolicy(id, policyDocumentId),
    onSuccess: onWrite,
  })
}
