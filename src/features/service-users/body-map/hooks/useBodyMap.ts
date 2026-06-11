import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addBodyMapReview,
  closeBodyMapRecord,
  createBodyMapRecord,
  fetchBodyMapSummary,
  fetchServiceUserBodyMap,
} from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'
import type {
  BodyMapWoundReviewPayload,
  CreateBodyMapRecordPayload,
} from '@/features/service-users/body-map/types'

export function useServiceUserBodyMap(
  serviceUserId: string,
  includeResolved = false,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: bodyMapKeys.list(serviceUserId, includeResolved),
    queryFn: ({ signal }) =>
      fetchServiceUserBodyMap(serviceUserId, { includeResolved, signal }),
    enabled: Boolean(serviceUserId) && (options?.enabled ?? true),
  })
}

export function useBodyMapSummary(serviceUserId: string) {
  return useQuery({
    queryKey: bodyMapKeys.summary(serviceUserId),
    queryFn: ({ signal }) => fetchBodyMapSummary(serviceUserId, signal),
  })
}

export function useBodyMapMutations(serviceUserId: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: bodyMapKeys.list(serviceUserId) })
    void qc.invalidateQueries({ queryKey: bodyMapKeys.summary(serviceUserId) })
    void qc.invalidateQueries({ queryKey: bodyMapKeys.alerts(serviceUserId) })
    void qc.invalidateQueries({ queryKey: bodyMapKeys.all })
  }

  const create = useMutation({
    mutationFn: (payload: CreateBodyMapRecordPayload) => createBodyMapRecord(payload),
    onSuccess: invalidate,
  })

  const close = useMutation({
    mutationFn: ({
      recordId,
      ...payload
    }: { recordId: string; closureNote: string; managerSignOff?: boolean }) =>
      closeBodyMapRecord(recordId, payload),
    onSuccess: invalidate,
  })

  const addReview = useMutation({
    mutationFn: ({
      recordId,
      ...payload
    }: { recordId: string } & (BodyMapWoundReviewPayload | {
        conditionStatus: string
        reviewNote?: string
      })) => addBodyMapReview(recordId, payload),
    onSuccess: invalidate,
  })

  return { create, close, addReview }
}
