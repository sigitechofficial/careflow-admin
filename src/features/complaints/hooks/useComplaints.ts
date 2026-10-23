import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { UpsertIncidentInvestigationInput } from '@/features/incidents/types'
import {
  addFeedbackNote,
  createFeedback,
  deleteFeedback,
  fetchFeedback,
  fetchFeedbackInvestigators,
  fetchFeedbackList,
  fetchFeedbackSummary,
  pauseFeedbackInvestigation,
  resumeFeedbackInvestigation,
  transitionFeedback,
  updateFeedback,
  upsertFeedbackInvestigation,
  type CreateFeedbackPayload,
  type FeedbackDetail,
  type FeedbackListParams,
  type FeedbackTransitionPayload,
  type UpdateFeedbackPayload,
} from '@/features/complaints/api/complaints.api'
import { complaintKeys } from '@/features/complaints/keys'

export function useFeedbackList(params: FeedbackListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: complaintKeys.list(params),
    queryFn: () => fetchFeedbackList(params),
    enabled: options?.enabled ?? true,
  })
}

export function useFeedbackSummary(enabled = true) {
  return useQuery({ queryKey: complaintKeys.summary(), queryFn: fetchFeedbackSummary, enabled })
}

export function useFeedback(id: string) {
  return useQuery({ queryKey: complaintKeys.detail(id), queryFn: () => fetchFeedback(id), enabled: Boolean(id) })
}

/** Writes refresh lists + summary; detail-returning writes also seed the detail cache. */
function useOnWrite() {
  const qc = useQueryClient()
  return (detail?: FeedbackDetail) => {
    if (detail) qc.setQueryData(complaintKeys.detail(detail.id), detail)
    void qc.invalidateQueries({ queryKey: [...complaintKeys.all(), 'list'] })
    void qc.invalidateQueries({ queryKey: complaintKeys.summary() })
  }
}

export function useCreateFeedback() {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (body: CreateFeedbackPayload) => createFeedback(body),
    onSuccess: () => onWrite(),
  })
}

export function useUpdateFeedback(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (body: UpdateFeedbackPayload) => updateFeedback(id, body),
    onSuccess: onWrite,
  })
}

export function useTransitionFeedback(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (body: FeedbackTransitionPayload) => transitionFeedback(id, body),
    onSuccess: onWrite,
  })
}

export function useAddFeedbackNote(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (note: string) => addFeedbackNote(id, note),
    onSuccess: onWrite,
  })
}

export function useDeleteFeedback(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (reason: string) => deleteFeedback(id, reason),
    onSuccess: () => onWrite(),
  })
}

export function useUpsertFeedbackInvestigation(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (input: UpsertIncidentInvestigationInput) => upsertFeedbackInvestigation(id, input),
    onSuccess: (detail) => {
      toastSuccess('Investigation saved')
      onWrite(detail)
    },
    onError: (e) => toastApiError(e),
  })
}

/** Eligible lead investigators (only fetched while the set-up can be edited). */
export function useFeedbackInvestigators(id: string, enabled: boolean) {
  return useQuery({
    queryKey: complaintKeys.investigators(id),
    queryFn: ({ signal }) => fetchFeedbackInvestigators(id, { signal }),
    enabled,
    staleTime: 60 * 1000,
  })
}

export function usePauseFeedbackInvestigation(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: (input: { reason: string; nextReviewDate: string }) => pauseFeedbackInvestigation(id, input),
    onSuccess: (detail) => {
      toastSuccess('Investigation paused')
      onWrite(detail)
    },
    onError: (e) => toastApiError(e),
  })
}

export function useResumeFeedbackInvestigation(id: string) {
  const onWrite = useOnWrite()
  return useMutation({
    mutationFn: () => resumeFeedbackInvestigation(id),
    onSuccess: (detail) => {
      toastSuccess('Investigation resumed')
      onWrite(detail)
    },
    onError: (e) => toastApiError(e),
  })
}
