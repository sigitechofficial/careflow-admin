import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approvePolicy,
  archivePolicy,
  createPolicy,
  deletePolicy,
  createPolicyCategory,
  createPolicyTag,
  createPolicyVersion,
  deletePolicyCategory,
  deletePolicyTag,
  fetchPolicy,
  fetchPolicyCategories,
  fetchPolicies,
  fetchPolicyDocumentBlob,
  fetchPolicyTags,
  fetchPolicyVersion,
  fetchPolicyVersions,
  fetchApplicablePolicies,
  fetchPolicyAudienceRoles,
  publishPolicy,
  removePolicyVersionDocument,
  requestPolicyChanges,
  submitPolicyForReview,
  updatePolicy,
  updatePolicyCategory,
  updatePolicyTag,
  uploadPolicyVersionDocument,
} from '@/features/policies/api/policies.api'
import { policyKeys } from '@/features/policies/keys'
import type {
  ApplicablePoliciesParams,
  PolicyCategoryInput,
  PolicyCategoryListParams,
  PolicyListParams,
  PolicyTagListParams,
  PolicyWriteInput,
} from '@/features/policies/types/policy.types'

function invalidatePolicies(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: policyKeys.all })
}

export function usePolicies(params?: PolicyListParams) {
  return useQuery({
    queryKey: policyKeys.list(params),
    queryFn: () => fetchPolicies(params),
  })
}

export function useApplicablePolicies(params: ApplicablePoliciesParams, enabled = true) {
  return useQuery({
    queryKey: policyKeys.applicable(params),
    queryFn: () => fetchApplicablePolicies({ ...params, limit: params.limit ?? 50 }),
    enabled,
  })
}

export function usePolicy(id: string | undefined) {
  return useQuery({
    queryKey: policyKeys.detail(id ?? ''),
    queryFn: () => fetchPolicy(id!),
    enabled: Boolean(id),
  })
}

/** Sign-in roles for a policy's audience (Admin → Roles & permissions), the ones saving and acknowledgement use. */
export function usePolicyAudienceRoles() {
  return useQuery({
    queryKey: [...policyKeys.all, 'audience-roles'],
    queryFn: fetchPolicyAudienceRoles,
    staleTime: 10 * 60 * 1000,
  })
}

export function usePolicyVersions(id: string | undefined) {
  return useQuery({
    queryKey: policyKeys.versions(id ?? ''),
    queryFn: () => fetchPolicyVersions(id!),
    enabled: Boolean(id),
  })
}

export function usePolicyVersion(id: string | undefined, versionId: string | undefined) {
  return useQuery({
    queryKey: policyKeys.version(id ?? '', versionId ?? ''),
    queryFn: () => fetchPolicyVersion(id!, versionId!),
    enabled: Boolean(id && versionId),
  })
}

export function usePolicyCategories(params?: PolicyCategoryListParams) {
  return useQuery({
    queryKey: policyKeys.categories(params),
    queryFn: () => fetchPolicyCategories(params),
  })
}

export function usePolicyTags(params?: PolicyTagListParams) {
  return useQuery({
    queryKey: policyKeys.tags(params),
    queryFn: () => fetchPolicyTags(params),
  })
}

export function useCreatePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PolicyWriteInput) => createPolicy(body),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function useUpdatePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<PolicyWriteInput> }) => updatePolicy(id, body),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function useSubmitPolicyForReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) => submitPolicyForReview(id, comments),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function useRequestPolicyChanges() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments: string }) => requestPolicyChanges(id, comments),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function useApprovePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) => approvePolicy(id, comments),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function usePublishPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changeSummary }: { id: string; changeSummary?: string }) =>
      publishPolicy(id, changeSummary),
    onSuccess: doc => {
      qc.setQueryData(policyKeys.detail(doc.id), doc)
      invalidatePolicies(qc)
    },
  })
}

export function useArchivePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archivePolicy(id),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function useDeletePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: policyKeys.all })
      qc.removeQueries({ queryKey: policyKeys.detail(id) })
    },
  })
}

export function useCreatePolicyVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      bump,
      changeSummary,
      reusePreviousContent,
    }: {
      id: string
      bump: 'minor' | 'major'
      changeSummary?: string
      reusePreviousContent?: boolean
    }) => createPolicyVersion(id, { bump, changeSummary, reusePreviousContent }),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function useUploadPolicyDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      policyId,
      versionId,
      file,
      onProgress,
    }: {
      policyId: string
      versionId: string
      file: File
      onProgress?: (percent: number) => void
    }) => uploadPolicyVersionDocument(policyId, versionId, file, onProgress),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function usePolicyDocumentFile() {
  return {
    fetchBlob: fetchPolicyDocumentBlob,
  }
}

export function useRemovePolicyDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ policyId, versionId }: { policyId: string; versionId: string }) =>
      removePolicyVersionDocument(policyId, versionId),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function useCreatePolicyCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PolicyCategoryInput) => createPolicyCategory(body),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function useUpdatePolicyCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<PolicyCategoryInput> }) =>
      updatePolicyCategory(id, body),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function useDeletePolicyCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePolicyCategory(id),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function useCreatePolicyTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createPolicyTag({ name }),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function useUpdatePolicyTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updatePolicyTag(id, { name }),
    onSuccess: () => invalidatePolicies(qc),
  })
}

export function useDeletePolicyTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePolicyTag(id),
    onSuccess: () => invalidatePolicies(qc),
  })
}
