import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { SetupChecklist } from '@/features/setup-checklist/types'

export async function fetchSetupChecklist(init?: RequestInit): Promise<SetupChecklist> {
  const res = await apiJson<ApiEnvelope<SetupChecklist>>('/setup-checklist', { method: 'GET', ...init })
  return res.data as SetupChecklist
}
