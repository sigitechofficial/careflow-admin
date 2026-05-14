import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotificationPreferences,
  patchNotificationPreferences,
} from '@/features/notifications/api/notifications.api'
import type { NotificationPreferenceRow } from '@/features/notifications/types/notification.types'

export function useNotificationPreferences(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchNotificationPreferences,
    enabled,
  })
  const m = useMutation({
    mutationFn: (preferences: NotificationPreferenceRow[]) =>
      patchNotificationPreferences(preferences),
    onSuccess: data => {
      qc.setQueryData(['notification-preferences'], data)
    },
  })
  return { ...q, updatePreferences: m.mutateAsync, updating: m.isPending }
}
