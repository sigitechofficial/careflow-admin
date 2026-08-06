import { useQuery } from '@tanstack/react-query'
import {
  fetchServiceUserCompletedVisits,
  type ServiceUserActivityVisitQuery,
} from '@/features/service-users/activity/api'
import { serviceUserKeys } from '@/features/service-users/keys'
import { getApiBaseUrl } from '@/shared/lib/api-base'

export function useServiceUserVisitActivity(
  serviceUserId: string,
  params?: ServiceUserActivityVisitQuery,
) {
  const page = params?.page ?? 1
  const limit = params?.limit ?? 50
  const dateFrom = params?.dateFrom?.trim() || undefined
  const dateTo = params?.dateTo?.trim() || undefined
  return useQuery({
    queryKey: serviceUserKeys.visitActivity(serviceUserId, { page, limit, dateFrom, dateTo }),
    queryFn: () => fetchServiceUserCompletedVisits(serviceUserId, { page, limit, dateFrom, dateTo }),
    enabled: Boolean(getApiBaseUrl()) && Boolean(serviceUserId),
  })
}
