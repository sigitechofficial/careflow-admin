import { useQuery } from '@tanstack/react-query'
import { fetchCarePathwayOverview } from '@/features/care-pathway/api/care-pathway.api'
import { carePathwayKeys } from '@/features/care-pathway/keys'

export function useCarePathwayOverview() {
  return useQuery({
    queryKey: carePathwayKeys.overview(),
    queryFn: () => fetchCarePathwayOverview(),
    staleTime: 30_000,
  })
}
