import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addFeedbackNote,
  createFeedback,
  deleteFeedback,
  fetchFeedback,
  fetchFeedbackList,
  fetchFeedbackSummary,
  transitionFeedback,
  updateFeedback,
  type CreateFeedbackPayload,
  type FeedbackDetail,
  type FeedbackListParams,
  type FeedbackTransitionPayload,
  type UpdateFeedbackPayload,
} from '@/features/complaints/api/complaints.api'
import { complaintKeys } from '@/features/complaints/keys'

export function useFeedbackList(params: FeedbackListParams) {
  return useQuery({ queryKey: complaintKeys.list(params), queryFn: () => fetchFeedbackList(params) })
}

export function useFeedbackSummary() {
  return useQuery({ queryKey: complaintKeys.summary(), queryFn: fetchFeedbackSummary })
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
