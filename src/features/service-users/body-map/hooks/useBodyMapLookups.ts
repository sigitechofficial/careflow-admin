import { useQuery } from '@tanstack/react-query'
import { fetchBodyMapLookups } from '@/features/service-users/body-map/api'
import { bodyMapKeys } from '@/features/service-users/body-map/keys'

const STALE_MS = 5 * 60 * 1000

export function useBodyMapLookups(enabled = true) {
  return useQuery({
    queryKey: bodyMapKeys.lookups(),
    queryFn: ({ signal }) => fetchBodyMapLookups(signal),
    enabled,
    staleTime: STALE_MS,
  })
}
