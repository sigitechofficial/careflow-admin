import { apiJson } from '@/shared/api/api-client'
import { buildQueryString, unwrapEnvelope } from '@/shared/api/envelope'

export type MessageChannel = 'EMAIL' | 'TEXT' | 'WHATSAPP' | 'PUSH'
export type MessageAudience = 'EVERYONE' | 'ALLOWED_ONLY'
/** SKIPPED: nothing to deliver to (no phone signed in to the carer app, push not set up on the server). */
export type DeliveryOutcome = 'SENT' | 'HELD' | 'REDIRECTED' | 'SKIPPED' | 'FAILED'

export type MessageAudienceKey =
  | 'FUNDERS'
  | 'REGULATORS'
  | 'REFERRERS'
  | 'PROFESSIONALS'
  | 'PEOPLE'
  | 'CARERS'
  | 'MANAGERS'
  | 'APPLICANTS'
  | 'PLATFORM'
  | 'ANY'

export type MessageKind = {
  id: string
  key: string
  channel: MessageChannel
  label: string
  audience: MessageAudienceKey[]
  /** What it is for. */
  why: string
  /** What makes CareFlow send it. */
  when: string
  /** LIVE: sent today. TO_BUILD: needed but not built yet (its switch applies once it is). */
  status: 'LIVE' | 'TO_BUILD'
  ifOff?: string
  essential?: boolean
  enabled: boolean
}

/** The fields staff change on the page. */
export type DeliveryRules = {
  emailEnabled: boolean
  textEnabled: boolean
  whatsappEnabled: boolean
  pushEnabled: boolean
  emailAudience: MessageAudience
  textAudience: MessageAudience
  pushAudience: MessageAudience
  allowedEmails: string[]
  allowedPhones: string[]
  disabledKinds: string[]
  heldEmailsTo: string | null
}

export type MessageDeliverySettings = DeliveryRules & {
  kinds: MessageKind[]
  audiences: Array<{ key: MessageAudienceKey; label: string; hint: string }>
  environment: {
    production: boolean
    email: { mode: string; redirectTo: string[]; bccCount: number }
    text: { mode: 'log' | 'off' | 'live'; provider: string | null }
    whatsapp: { configured: boolean }
    push: { ready: boolean }
  }
  updatedAt: string | null
  last24h: Array<{ channel: MessageChannel; kind: string; outcome: DeliveryOutcome; count: number }>
  logDays: number
}

export type DeliveryLogRow = {
  id: string
  at: string
  channel: MessageChannel
  kind: string
  recipient: string
  subject: string | null
  outcome: DeliveryOutcome
  reason: string | null
}

const BASE = '/message-delivery'

export async function fetchMessageDelivery(): Promise<MessageDeliverySettings> {
  return unwrapEnvelope<MessageDeliverySettings>(await apiJson<unknown>(BASE, { method: 'GET' }))
}

export async function saveMessageDelivery(patch: Partial<DeliveryRules>): Promise<MessageDeliverySettings> {
  return unwrapEnvelope<MessageDeliverySettings>(await apiJson<unknown>(BASE, { method: 'PATCH', body: JSON.stringify(patch) }))
}

export async function fetchDeliveryLog(params: { channel?: string; outcome?: string; q?: string; limit?: number }): Promise<DeliveryLogRow[]> {
  const data = unwrapEnvelope<{ items?: DeliveryLogRow[] }>(
    await apiJson<unknown>(`${BASE}/log${buildQueryString({ ...params, q: params.q?.trim() || undefined })}`, { method: 'GET' }),
  )
  return Array.isArray(data?.items) ? data.items : []
}

export async function sendTestMessage(input: { channel: 'EMAIL' | 'TEXT' | 'PUSH'; to: string }): Promise<string> {
  const data = unwrapEnvelope<{ message?: string }>(await apiJson<unknown>(`${BASE}/test`, { method: 'POST', body: JSON.stringify(input) }))
  return data?.message ?? 'Sent.'
}
