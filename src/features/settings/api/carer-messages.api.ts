import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CarerMessageAudienceInput,
  CarerMessagePreview,
  CarerMessageRow,
  CarerMessageSendResult,
  SendCarerMessageInput,
} from '@/features/settings/types'

export async function listCarerMessages(): Promise<CarerMessageRow[]> {
  const res = await apiJson<ApiEnvelope<CarerMessageRow[]>>('/carer-messages?limit=50')
  return res.data ?? []
}

export async function previewCarerMessage(input: CarerMessageAudienceInput): Promise<CarerMessagePreview> {
  const res = await apiJson<ApiEnvelope<CarerMessagePreview>>('/carer-messages/preview', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data as CarerMessagePreview
}

export async function sendCarerMessage(
  input: SendCarerMessageInput,
): Promise<{ message: string; data: CarerMessageSendResult }> {
  const res = await apiJson<ApiEnvelope<CarerMessageSendResult>>('/carer-messages', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return { message: res.message ?? 'Notification sent', data: res.data as CarerMessageSendResult }
}
