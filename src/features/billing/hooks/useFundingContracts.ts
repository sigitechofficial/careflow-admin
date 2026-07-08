import { useQuery } from '@tanstack/react-query'
import {
  fetchFundingContracts,
  fetchFundingContractsSummary,
} from '@/features/billing/api/funding-contracts.api'
import { billingKeys } from '@/features/billing/keys'

export function useFundingContracts(filters?: {
  search?: string
  readiness?: 'READY' | 'INCOMPLETE' | 'ENDED' | 'NO_FUNDING' | 'ALL'
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: billingKeys.fundingContracts(filters),
    queryFn: () => fetchFundingContracts(filters),
  })
}

export function useFundingContractsSummary() {
  return useQuery({
    queryKey: billingKeys.fundingContractsSummary(),
    queryFn: fetchFundingContractsSummary,
  })
}
