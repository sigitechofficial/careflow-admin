import { useQuery } from '@tanstack/react-query'
import { fetchServiceUserLookups } from '@/features/service-users/api'
import { serviceUserKeys } from '../keys'

/**
 * Fetches the service-user lookups bundle (statuses, titles, genders,
 * risk levels, etc.). Shared across list and detail pages.
 *
 * staleTime is generous (10 min) because lookups rarely change mid-session.
 */
export function useServiceUserLookups() {
  return useQuery({
    queryKey: serviceUserKeys.lookups(),
    queryFn: ({ signal }) => fetchServiceUserLookups({ signal }),
    staleTime: 10 * 60 * 1000,
  })
}
