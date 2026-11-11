import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelOverCareVisits,
  fetchOverCareReview,
  fetchOverCareReviews,
  markOverCareNoAction,
  type OverCareReviewStatus,
} from '@/features/over-care-reviews/api'

export const overCareReviewKeys = {
  all: ['over-care-reviews'] as const,
  list: (status: OverCareReviewStatus) => [...overCareReviewKeys.all, 'list', status] as const,
  detail: (id: string) => [...overCareReviewKeys.all, 'detail', id] as const,
}

export function useOverCareReviews(status: OverCareReviewStatus) {
  return useQuery({
    queryKey: overCareReviewKeys.list(status),
    queryFn: () => fetchOverCareReviews(status),
    placeholderData: previous => previous,
  })
}

export function useOverCareReview(id: string | null) {
  return useQuery({
    queryKey: overCareReviewKeys.detail(id ?? ''),
    queryFn: () => fetchOverCareReview(id!),
    enabled: Boolean(id),
  })
}

/** After a decision: the lists, the review and the timebank (its weeks change) are reloaded. */
function useRefreshAfterDecision() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: overCareReviewKeys.all })
    void qc.invalidateQueries({ queryKey: ['timebank'] })
  }
}

export function useCancelOverCareVisits() {
  const refresh = useRefreshAfterDecision()
  return useMutation({
    mutationFn: (v: { id: string; scheduledJobIds: string[]; note?: string }) =>
      cancelOverCareVisits(v.id, { scheduledJobIds: v.scheduledJobIds, note: v.note }),
    onSuccess: refresh,
  })
}

export function useMarkOverCareNoAction() {
  const refresh = useRefreshAfterDecision()
  return useMutation({
    mutationFn: (v: { id: string; reason: string }) => markOverCareNoAction(v.id, v.reason),
    onSuccess: refresh,
  })
}
