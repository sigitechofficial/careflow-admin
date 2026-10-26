import { useQuery } from '@tanstack/react-query'
import { fetchServiceUserFundingUsage } from '@/features/billing/api/funding-usage.api'
import { billingKeys } from '@/features/billing/keys'
import type { FundingUsagePeriod } from '@/features/billing/types/funding-usage.types'

export function useServiceUserFundingUsage(
  serviceUserId: string,
  params: { period: FundingUsagePeriod; date: string },
  enabled = true,
) {
  return useQuery({
    queryKey: billingKeys.fundingUsage(serviceUserId, params),
    queryFn: () => fetchServiceUserFundingUsage(serviceUserId, params),
    enabled: enabled && Boolean(serviceUserId),
  })
}
