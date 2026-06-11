import { useQuery } from '@tanstack/react-query'
import { fetchVitalAcceptedRangeLookup } from '@/features/service-users/initial-assessment/api'
import { VITAL_ACCEPTED_RANGE_LOOKUP } from '@/features/service-users/initial-assessment/utils/vital-accepted-ranges.lookup'

export const vitalAcceptedRangeLookupKey = ['initial-assessment', 'vital-accepted-ranges'] as const

export function useVitalAcceptedRangeLookup() {
  return useQuery({
    queryKey: vitalAcceptedRangeLookupKey,
    queryFn: ({ signal }) => fetchVitalAcceptedRangeLookup(signal),
    staleTime: 30 * 60 * 1000,
    placeholderData: VITAL_ACCEPTED_RANGE_LOOKUP,
  })
}
