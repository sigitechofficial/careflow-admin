import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acknowledgePolicy,
  fetchMyPolicyAcknowledgements,
  fetchPolicyAcknowledgementReport,
  fetchPolicyAcknowledgementSummary,
  fetchPolicyPublishPreview,
  recordPolicyViewed,
} from '@/features/policies/api/policies.api'
import { policyKeys } from '@/features/policies/keys'

/** Policies the signed-in user (as an employee) must read and acknowledge. */
export function useMyPolicyAcknowledgements(enabled = true) {
  return useQuery({
    queryKey: policyKeys.myAcknowledgements(),
    queryFn: fetchMyPolicyAcknowledgements,
    enabled,
  })
}

export function useRecordPolicyViewed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) => recordPolicyViewed(documentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: policyKeys.myAcknowledgements() })
    },
  })
}

export function useAcknowledgePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) => acknowledgePolicy(documentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: policyKeys.acknowledgements() })
    },
  })
}

/** Manager report for one policy (current published version, within the manager's branches). */
export function usePolicyAcknowledgementReport(documentId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: policyKeys.acknowledgementReport(documentId ?? ''),
    queryFn: () => fetchPolicyAcknowledgementReport(documentId!),
    enabled: Boolean(documentId) && enabled,
  })
}

/** Publish dialog: staff who would need to acknowledge the working version, and by when. */
export function usePolicyPublishPreview(documentId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: policyKeys.publishPreview(documentId ?? ''),
    queryFn: () => fetchPolicyPublishPreview(documentId!),
    enabled: Boolean(documentId) && enabled,
    staleTime: 30_000,
  })
}

/** Manager counts per published policy needing acknowledgement (library column). */
export function usePolicyAcknowledgementSummary(enabled = true) {
  return useQuery({
    queryKey: policyKeys.acknowledgementSummary(),
    queryFn: fetchPolicyAcknowledgementSummary,
    enabled,
  })
}
