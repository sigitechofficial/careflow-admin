import { useQuery } from '@tanstack/react-query'
import { listServiceUsers, type ListServiceUsersParams } from '@/features/service-users/api'
import { serviceUserKeys } from '../keys'

/**
 * Paginated, filtered service-user list.
 *
 * Query is automatically cancelled when the component unmounts or params change.
 * AbortError is never surfaced â€” handled globally by apiJson + QueryClient.
 *
 * Placeholder data keeps the previous page visible while the next page loads,
 * preventing a full loading spinner on every pagination click.
 */
export function useServiceUsers(params: ListServiceUsersParams, enabled = true) {
  return useQuery({
    queryKey: serviceUserKeys.list(params),
    queryFn: ({ signal }) => listServiceUsers(params, { signal }),
    placeholderData: (prev) => prev,
    enabled,
  })
}
