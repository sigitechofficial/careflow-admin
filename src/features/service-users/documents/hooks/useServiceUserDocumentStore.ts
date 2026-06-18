import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  deleteServiceUserDocumentRecord,
  fetchServiceUserDocumentStore,
  updateServiceUserDocumentRecord,
  uploadServiceUserDocumentRecord,
  type CreateServiceUserDocumentRecordPayload,
  type UpdateServiceUserDocumentRecordPayload,
} from '@/features/service-users/documents/service-user-document-store.api'

export function useServiceUserDocumentStore(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.documentStore(serviceUserId),
    queryFn: ({ signal }) => fetchServiceUserDocumentStore(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
  })
}

export function useServiceUserDocumentStoreMutations(serviceUserId: string) {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: serviceUserKeys.documentStore(serviceUserId) })

  const upload = useMutation({
    mutationFn: (payload: CreateServiceUserDocumentRecordPayload) =>
      uploadServiceUserDocumentRecord(serviceUserId, payload),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({
      documentId,
      body,
    }: {
      documentId: string
      body: UpdateServiceUserDocumentRecordPayload
    }) => updateServiceUserDocumentRecord(serviceUserId, documentId, body),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (documentId: string) => deleteServiceUserDocumentRecord(serviceUserId, documentId),
    onSuccess: invalidate,
  })

  return { upload, update, remove }
}
