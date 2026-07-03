import { useQuery } from '@tanstack/react-query'
import {
  fetchServiceUserPortalAccounts,
  type ListServiceUserPortalAccountsParams,
} from '@/features/service-user-portal/api/portal.api'

export const serviceUserPortalAdminKeys = {
  all: ['service-user-portal-admin'] as const,
  list: (params: ListServiceUserPortalAccountsParams) =>
    [...serviceUserPortalAdminKeys.all, 'list', params] as const,
}

export function useServiceUserPortalAccounts(params: ListServiceUserPortalAccountsParams, enabled = true) {
  return useQuery({
    queryKey: serviceUserPortalAdminKeys.list(params),
    queryFn: ({ signal }) => fetchServiceUserPortalAccounts(params, { signal }),
    enabled,
    staleTime: 30_000,
  })
}
