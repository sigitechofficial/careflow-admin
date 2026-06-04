import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type OpenFdaDrugLabelHit = {
  id: string
  displayName: string
  brandName?: string
  genericName?: string
  substanceNames: string[]
  routes: string[]
  dosageFormHint?: string
  purpose?: string
  indications?: string
  activeIngredient?: string
  doseHint?: string
  isControlledHint: boolean
  productType?: string
}

export async function searchOpenFdaDrugLabels(
  q: string,
  limit = 8,
): Promise<OpenFdaDrugLabelHit[]> {
  const params = new URLSearchParams({ q: q.trim(), limit: String(limit) })
  const res = await apiJson<ApiEnvelope<OpenFdaDrugLabelHit[]>>(
    `/openfda/drug-labels/search?${params}`,
    { method: 'GET' },
  )
  return res.data
}
