import { useQuery } from '@tanstack/react-query'
import { getApiBaseUrl } from '@/lib/api-base'
import { useAuthStore } from '@/store/auth.store'
import { listServiceUsers, type ServiceUserListRow } from '@/lib/service-users-api'

export type ServiceUserPickerOption = {
  id: string
  label: string
}

function toLabel(row: ServiceUserListRow): string {
  const name = row.preferredName?.trim() || [row.firstName, row.lastName].filter(Boolean).join(' ')
  const num = row.serviceUserNumber ? ` (${row.serviceUserNumber})` : ''
  return `${name}${num}`.trim() || row.id
}

export function useServiceUsersForCalendar(enabled: boolean) {
  const hasApi = !!getApiBaseUrl()
  const can = useAuthStore(s => s.can('service_users.read'))

  return useQuery({
    queryKey: ['service-users', 'calendar-picker'],
    queryFn: async () => {
      const { rows } = await listServiceUsers({
        limit: 100,
        sortBy: 'lastName',
        sortOrder: 'asc',
      })
      return rows.map((r): ServiceUserPickerOption => ({ id: r.id, label: toLabel(r) }))
    },
    enabled: hasApi && can && enabled,
    staleTime: 60_000,
  })
}
