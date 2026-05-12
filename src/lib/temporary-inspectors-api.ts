import type { ApiEnvelope } from '@/lib/api-client'
import { ApiError, apiJson } from '@/lib/api-client'

export type ServiceUserOption = { id: string; name: string }

export type TemporaryInspectorRow = {
  id: string
  firstName: string
  lastName: string
  username: string
  reason: string
  serviceUserKeys: string[]
  residentScopeLabel: string
  validFrom: string
  validTo: string
  status: 'Active' | 'Expired'
  expireOnLabel: string
}

export async function fetchTemporaryInspectorServiceUserOptions(): Promise<ServiceUserOption[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserOption[]>>('/temporary-inspectors/service-user-options', {
    method: 'GET',
  })
  return res.data
}

export async function fetchTemporaryInspectors(): Promise<TemporaryInspectorRow[]> {
  const res = await apiJson<ApiEnvelope<TemporaryInspectorRow[]>>('/temporary-inspectors', { method: 'GET' })
  return res.data
}

export async function createTemporaryInspector(body: {
  firstName: string
  lastName: string
  username: string
  password: string
  reason: string
  serviceUserKeys?: string[]
  validFrom: string
  validTo: string
}): Promise<{ id: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string }>>('/temporary-inspectors', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteTemporaryInspector(id: string): Promise<void> {
  await apiJson(`/temporary-inspectors/${id}`, { method: 'DELETE' })
}

export { ApiError }
