import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  OnCallCallInput,
  OnCallCallRow,
  OnCallCallStatus,
  OnCallShiftInput,
  OnCallShiftRow,
} from '@/features/on-call/types'

export const onCallKeys = {
  all: ['on-call'] as const,
  now: () => [...onCallKeys.all, 'now'] as const,
  shifts: (from: string, to: string) => [...onCallKeys.all, 'shifts', from, to] as const,
  calls: (status: OnCallCallStatus | 'ALL') => [...onCallKeys.all, 'calls', status] as const,
}

export async function fetchOnCallNow(): Promise<OnCallShiftRow[]> {
  const res = await apiJson<ApiEnvelope<OnCallShiftRow[]>>('/on-call/now')
  return res.data ?? []
}

export async function fetchOnCallShifts(from: string, to: string): Promise<OnCallShiftRow[]> {
  const q = new URLSearchParams({ from, to })
  const res = await apiJson<ApiEnvelope<OnCallShiftRow[]>>(`/on-call/shifts?${q}`)
  return res.data ?? []
}

export async function createOnCallShift(body: OnCallShiftInput): Promise<OnCallShiftRow> {
  const res = await apiJson<ApiEnvelope<OnCallShiftRow>>('/on-call/shifts', { method: 'POST', body: JSON.stringify(body) })
  return res.data as OnCallShiftRow
}

export async function updateOnCallShift(id: string, body: Partial<OnCallShiftInput>): Promise<OnCallShiftRow> {
  const res = await apiJson<ApiEnvelope<OnCallShiftRow>>(`/on-call/shifts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data as OnCallShiftRow
}

export async function deleteOnCallShift(id: string): Promise<void> {
  await apiJson<ApiEnvelope<{ id: string }>>(`/on-call/shifts/${id}`, { method: 'DELETE' })
}

export async function fetchOnCallCalls(status: OnCallCallStatus | 'ALL'): Promise<OnCallCallRow[]> {
  const q = status === 'ALL' ? '' : `?status=${status}`
  const res = await apiJson<ApiEnvelope<OnCallCallRow[]>>(`/on-call/calls${q}`)
  return res.data ?? []
}

export async function createOnCallCall(body: OnCallCallInput): Promise<OnCallCallRow> {
  const res = await apiJson<ApiEnvelope<OnCallCallRow>>('/on-call/calls', { method: 'POST', body: JSON.stringify(body) })
  return res.data as OnCallCallRow
}

export async function updateOnCallCall(id: string, body: Partial<OnCallCallInput>): Promise<OnCallCallRow> {
  const res = await apiJson<ApiEnvelope<OnCallCallRow>>(`/on-call/calls/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data as OnCallCallRow
}

export async function closeOnCallCall(id: string, closingNote: string): Promise<OnCallCallRow> {
  const res = await apiJson<ApiEnvelope<OnCallCallRow>>(`/on-call/calls/${id}/close`, {
    method: 'POST',
    body: JSON.stringify({ closingNote }),
  })
  return res.data as OnCallCallRow
}
