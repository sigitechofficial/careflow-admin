import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createServiceUserCommunicationNote,
  deleteServiceUserCommunicationNote,
  listServiceUserCommunicationNotes,
} from '@/features/service-users/api/communication-notes.api'
import type { CreateCommunicationNotePayload } from '@/features/service-users/comms/types'
import { serviceUserKeys } from '@/features/service-users/keys'

export function useServiceUserCommunicationNotes(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.communicationNotes(serviceUserId),
    queryFn: ({ signal }) => listServiceUserCommunicationNotes(serviceUserId, signal),
    enabled: Boolean(serviceUserId) && enabled,
  })
}

export function useCreateServiceUserCommunicationNote(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCommunicationNotePayload) =>
      createServiceUserCommunicationNote(serviceUserId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.communicationNotes(serviceUserId) })
    },
  })
}

export function useDeleteServiceUserCommunicationNote(serviceUserId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => deleteServiceUserCommunicationNote(serviceUserId, noteId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.communicationNotes(serviceUserId) })
    },
  })
}
