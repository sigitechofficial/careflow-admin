import type { IncidentAnalyticsFilters, IncidentListFilters } from '@/features/incidents/types'

export const incidentKeys = {
  all: () => ['incidents'] as const,
  categories: () => [...incidentKeys.all(), 'categories'] as const,
  visitOptions: (params: { date: string; serviceUserId?: string; employeeId?: string }) =>
    [...incidentKeys.all(), 'visit-options', params] as const,
  stats: (locationId?: string | null) =>
    [...incidentKeys.all(), 'stats', locationId ?? 'all'] as const,
  analytics: (filters: IncidentAnalyticsFilters) => [...incidentKeys.all(), 'analytics', filters] as const,
  list: (filters: IncidentListFilters) => [...incidentKeys.all(), 'list', filters] as const,
  detail: (id: string) => [...incidentKeys.all(), 'detail', id] as const,
  actions: (id: string) => [...incidentKeys.all(), 'actions', id] as const,
  myActions: () => [...incidentKeys.all(), 'my-actions'] as const,
}
