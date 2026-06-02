import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { CarePathwayOverview } from '../types/care-pathway.types'

export async function fetchCarePathwayOverview(): Promise<CarePathwayOverview> {
  const res = await apiJson<ApiEnvelope<CarePathwayOverview>>('/care-pathway/overview', { method: 'GET' })
  return res.data
}
