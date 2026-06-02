import { useQueries } from '@tanstack/react-query'
import {
  fetchServiceUserDocuments,
  listServiceUserAllergies,
} from '@/features/service-users/api'
import { serviceUserKeys } from '@/features/service-users/keys'

/** Documents + allergies for the care plan page header panels. */
export function useServiceUserCarePlanExtras(serviceUserId: string, enabled = true) {
  const [documents, allergies] = useQueries({
    queries: [
      {
        queryKey: serviceUserKeys.documents(serviceUserId),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          fetchServiceUserDocuments(serviceUserId, { signal }),
        enabled: enabled && Boolean(serviceUserId),
        staleTime: 30_000,
      },
      {
        queryKey: serviceUserKeys.allergies(serviceUserId),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          listServiceUserAllergies(serviceUserId, { signal }),
        enabled: enabled && Boolean(serviceUserId),
        staleTime: 30_000,
      },
    ],
  })

  return { documents, allergies }
}
