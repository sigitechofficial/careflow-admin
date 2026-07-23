import { useQuery } from '@tanstack/react-query'
import {
  fetchServiceUserHoursMonthlyDetail,
  fetchServiceUserHoursWeeklySummary,
  type ServiceUserHoursMonthlyDetailParams,
  type ServiceUserHoursWeeklyParams,
} from '@/features/service-users/api/service-user-hours.api'
import { serviceUserKeys } from '@/features/service-users/keys'

export function useServiceUserHoursWeeklySummary(
  params?: ServiceUserHoursWeeklyParams,
  enabled = true,
) {
  return useQuery({
    queryKey: serviceUserKeys.hoursWeekly(params),
    queryFn: () => fetchServiceUserHoursWeeklySummary(params),
    enabled,
    placeholderData: previous => previous,
  })
}

export function useServiceUserHoursMonthlyDetail(
  params: ServiceUserHoursMonthlyDetailParams | null,
  enabled = true,
) {
  return useQuery({
    queryKey: serviceUserKeys.hoursMonthlyDetail(params ?? undefined),
    queryFn: () => fetchServiceUserHoursMonthlyDetail(params!),
    enabled: enabled && params != null && Boolean(params.serviceUserId),
    placeholderData: previous => previous,
  })
}
