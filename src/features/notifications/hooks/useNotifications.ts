import { useQuery } from '@tanstack/react-query'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { fetchNotifications, type ListNotificationsParams } from '@/features/notifications/api/notifications.api'

export function useNotifications(params: ListNotificationsParams = {}) {
  const hasApi = !!getApiBaseUrl()
  const can = useAuthStore(s => s.can('notifications.read'))
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => fetchNotifications(params),
    enabled: hasApi && can,
    refetchOnWindowFocus: true,
  })
}
