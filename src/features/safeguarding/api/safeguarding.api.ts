import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CreateSafeguardingInput,
  ListSafeguardingParams,
  SafeguardingCase,
  SafeguardingInvestigation,
  SafeguardingLead,
  SafeguardingSummary,
  TransitionInput,
  UpdateSafeguardingInput,
  UpsertSafeguardingInvestigationInput,
} from '@/features/safeguarding/types/safeguarding.types'
import type { IncidentInvestigatorOption } from '@/features/incidents/types'

function buildQuery(params?: Record<string, string | undefined>): string {
  if (!params) return ''
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v)
  const s = qs.toString()
  return s ? `?${s}` : ''
}

async function data<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiJson<ApiEnvelope<T>>(path, init)
  return res.data
}

export async function listSafeguarding(params?: ListSafeguardingParams): Promise<SafeguardingCase[]> {
  return data<SafeguardingCase[]>(`/safeguarding${buildQuery(params)}`, { method: 'GET' })
}

export async function getSafeguardingSummary(locationId?: string): Promise<SafeguardingSummary> {
  return data<SafeguardingSummary>(`/safeguarding/summary${buildQuery({ locationId })}`, { method: 'GET' })
}

export async function listSafeguardingLeads(): Promise<SafeguardingLead[]> {
  return data<SafeguardingLead[]>('/safeguarding/leads', { method: 'GET' })
}

export async function getSafeguarding(id: string): Promise<SafeguardingCase> {
  return data<SafeguardingCase>(`/safeguarding/${id}`, { method: 'GET' })
}

export async function createSafeguarding(body: CreateSafeguardingInput): Promise<SafeguardingCase> {
  return data<SafeguardingCase>('/safeguarding', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateSafeguarding(
  id: string,
  body: UpdateSafeguardingInput,
): Promise<SafeguardingCase> {
  return data<SafeguardingCase>(`/safeguarding/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export async function transitionSafeguarding(
  id: string,
  body: TransitionInput,
): Promise<SafeguardingCase> {
  return data<SafeguardingCase>(`/safeguarding/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getSafeguardingInvestigation(id: string): Promise<SafeguardingInvestigation | null> {
  return data<SafeguardingInvestigation | null>(`/safeguarding/${id}/investigation`, { method: 'GET' })
}

export async function upsertSafeguardingInvestigation(
  id: string,
  body: UpsertSafeguardingInvestigationInput,
): Promise<SafeguardingInvestigation> {
  return data<SafeguardingInvestigation>(`/safeguarding/${id}/investigation`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function pauseSafeguardingInvestigation(
  id: string,
  body: { reason: string; nextReviewDate: string },
): Promise<SafeguardingInvestigation> {
  return data<SafeguardingInvestigation>(`/safeguarding/${id}/investigation/pause`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function resumeSafeguardingInvestigation(id: string): Promise<SafeguardingInvestigation> {
  return data<SafeguardingInvestigation>(`/safeguarding/${id}/investigation/resume`, { method: 'POST' })
}

export async function listSafeguardingInvestigators(): Promise<IncidentInvestigatorOption[]> {
  return data<IncidentInvestigatorOption[]>('/safeguarding/investigators', { method: 'GET' })
}

export async function addSafeguardingNote(id: string, note: string): Promise<SafeguardingCase> {
  return data<SafeguardingCase>(`/safeguarding/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
}
