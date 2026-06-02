import { useQuery } from '@tanstack/react-query'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { getCalendarEventTypes } from '@/features/service-users/api/service-user-calendar.api'

export function useCalendarEventTypes() {
  const hasApi = !!getApiBaseUrl()
  const can =
    useAuthStore(s => s.can('service_users.calendar_event_types.read')) ||
    useAuthStore(s => s.can('service_users.calendar.read'))

  return useQuery({
    queryKey: ['calendar-event-types'],
    queryFn: getCalendarEventTypes,
    enabled: hasApi && can,
    staleTime: 60_000,
  })
}
