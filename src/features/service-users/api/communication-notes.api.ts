import { ApiError, apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CommunicationNoteRow,
  CommunicationNoteShareTarget,
  CreateCommunicationNotePayload,
} from '@/features/service-users/comms/types'

export async function listServiceUserCommunicationNotes(
  serviceUserId: string,
  signal?: AbortSignal,
): Promise<CommunicationNoteRow[]> {
  const res = await apiJson<ApiEnvelope<CommunicationNoteRow[]>>(
    `/service-users/${serviceUserId}/communication-notes`,
    { method: 'GET', signal },
  )
  return res.data ?? []
}

export async function createServiceUserCommunicationNote(
  serviceUserId: string,
  payload: CreateCommunicationNotePayload,
): Promise<CommunicationNoteRow> {
  const res = await apiJson<ApiEnvelope<CommunicationNoteRow>>(
    `/service-users/${serviceUserId}/communication-notes`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
  if (!res.data) throw new ApiError('Communication note was not returned from the API', 0)
  return res.data
}

export async function deleteServiceUserCommunicationNote(
  serviceUserId: string,
  noteId: string,
): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(
    `/service-users/${serviceUserId}/communication-notes/${noteId}`,
    { method: 'DELETE' },
  )
}

export type { CommunicationNoteShareTarget }
