import { useQuery } from '@tanstack/react-query'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { fetchNotificationUnreadCount } from '@/features/notifications/api/notifications.api'

export function useUnreadNotificationCount() {
  const hasApi = !!getApiBaseUrl()
  const can = useAuthStore(s => s.can('notifications.read'))
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchNotificationUnreadCount,
    staleTime: 5_000,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
    enabled: hasApi && can,
  })
}
