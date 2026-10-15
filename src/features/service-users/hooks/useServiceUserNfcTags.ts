import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  createServiceUserNfcTag,
  deleteServiceUserNfcTag,
  fetchServiceUserNfcTags,
  fetchServiceUserNfcTagScans,
  updateServiceUserNfcTag,
  type CreateNfcTagPayload,
  type UpdateNfcTagPayload,
} from '@/features/service-users/api/nfc-tags.api'

export function useServiceUserNfcTags(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.nfcTags(serviceUserId),
    queryFn: ({ signal }) => fetchServiceUserNfcTags(serviceUserId, signal),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useServiceUserNfcTagScans(serviceUserId: string, tagId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.nfcTagScans(serviceUserId, tagId),
    queryFn: ({ signal }) => fetchServiceUserNfcTagScans(serviceUserId, tagId, signal),
    enabled: enabled && Boolean(serviceUserId && tagId),
  })
}

function useInvalidateNfcTags(serviceUserId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: serviceUserKeys.nfcTags(serviceUserId) })
}

export function useCreateServiceUserNfcTag(serviceUserId: string) {
  const invalidate = useInvalidateNfcTags(serviceUserId)
  return useMutation({
    mutationFn: (body: CreateNfcTagPayload) => createServiceUserNfcTag(serviceUserId, body),
    onSuccess: invalidate,
  })
}

export function useUpdateServiceUserNfcTag(serviceUserId: string) {
  const invalidate = useInvalidateNfcTags(serviceUserId)
  return useMutation({
    mutationFn: (v: { tagId: string } & UpdateNfcTagPayload) => {
      const { tagId, ...body } = v
      return updateServiceUserNfcTag(serviceUserId, tagId, body)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteServiceUserNfcTag(serviceUserId: string) {
  const invalidate = useInvalidateNfcTags(serviceUserId)
  return useMutation({
    mutationFn: (tagId: string) => deleteServiceUserNfcTag(serviceUserId, tagId),
    onSuccess: invalidate,
  })
}
