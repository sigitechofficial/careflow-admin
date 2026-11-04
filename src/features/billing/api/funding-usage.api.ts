import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { FundingUsage, FundingUsagePeriod } from '@/features/billing/types/funding-usage.types'

export async function fetchServiceUserFundingUsage(
  serviceUserId: string,
  params: { period: FundingUsagePeriod; date: string },
): Promise<FundingUsage> {
  const qs = new URLSearchParams({ period: params.period, date: params.date })
  const res = await apiJson<ApiEnvelope<FundingUsage>>(
    `/billing/service-users/${encodeURIComponent(serviceUserId)}/funding-usage?${qs}`,
    { method: 'GET' },
  )
  return res.data
}
