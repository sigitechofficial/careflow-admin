import { useQuery } from '@tanstack/react-query'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { getServiceUserCalendarView } from '@/features/service-users/api/service-user-calendar.api'
import type { CalendarEventStatus, CalendarViewParams } from '../types/service-user-calendar.types'

export function useServiceUserCalendar(serviceUserId: string | undefined, params: CalendarViewParams) {
  const hasApi = !!getApiBaseUrl()
  const can = useAuthStore(s => s.can('service_users.calendar.read'))

  return useQuery({
    queryKey: ['service-users', serviceUserId, 'calendar', params],
    queryFn: () => getServiceUserCalendarView(serviceUserId!, params),
    enabled: hasApi && can && !!serviceUserId,
  })
}

export function useGlobalServiceUserCalendar(params: {
  dateFrom: string
  dateTo: string
  eventTypeId?: string
  status?: CalendarEventStatus
  serviceUserId?: string
}) {
  const hasApi = !!getApiBaseUrl()
  const can = useAuthStore(s => s.can('service_users.calendar.read'))

  return useQuery({
    queryKey: ['service-users-calendar', params],
    queryFn: async () => {
      const { getGlobalServiceUsersCalendarEvents } = await import('@/features/service-users/api/service-user-calendar.api')
      return getGlobalServiceUsersCalendarEvents(params)
    },
    enabled: hasApi && can && !!params.dateFrom && !!params.dateTo,
  })
}
