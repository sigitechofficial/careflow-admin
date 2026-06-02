import { useQueries, useQuery } from '@tanstack/react-query'
import {
  fetchServiceUser,
  fetchServiceUserDocuments,
  listServiceUserAllergies,
  listServiceUserInventory,
  fetchServiceUserInitialAssessment,
  fetchServiceUserFlashMessage,
} from '@/features/service-users/api'
import { serviceUserKeys } from '../keys'

/**
 * Core profile for one service user.
 * Used by ViewServiceUserPage, EditServiceUserPage, and sub-pages.
 */
export function useServiceUser(id: string, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.profile(id),
    queryFn: ({ signal }) => fetchServiceUser(id, { signal }),
    enabled: enabled && Boolean(id),
  })
}

/**
 * All detail data for the service user overview page, fetched in parallel.
 * Returns an object of individual query results so the page can render
 * each section independently as data arrives.
 */
export function useServiceUserDetail(id: string) {
  const [profile, documents, allergies, inventory, initialAssessment, flashMessage] =
    useQueries({
      queries: [
        {
          queryKey: serviceUserKeys.profile(id),
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            fetchServiceUser(id, { signal }),
          enabled: Boolean(id),
        },
        {
          queryKey: serviceUserKeys.documents(id),
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            fetchServiceUserDocuments(id, { signal }),
          enabled: Boolean(id),
        },
        {
          queryKey: serviceUserKeys.allergies(id),
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            listServiceUserAllergies(id, { signal }),
          enabled: Boolean(id),
        },
        {
          queryKey: serviceUserKeys.inventory(id),
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            listServiceUserInventory(id, { signal }),
          enabled: Boolean(id),
        },
        {
          queryKey: serviceUserKeys.initialAssessment(id),
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            fetchServiceUserInitialAssessment(id, { signal }),
          enabled: Boolean(id),
        },
        {
          queryKey: serviceUserKeys.flashMessage(id),
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            fetchServiceUserFlashMessage(id, { signal }),
          enabled: Boolean(id),
        },
      ],
    })

  return { profile, documents, allergies, inventory, initialAssessment, flashMessage }
}
