import type { IncidentAnalyticsFilters, IncidentListFilters } from '@/features/incidents/types'

export const incidentKeys = {
  all: () => ['incidents'] as const,
  categories: () => [...incidentKeys.all(), 'categories'] as const,
  stats: () => [...incidentKeys.all(), 'stats'] as const,
  analytics: (filters: IncidentAnalyticsFilters) => [...incidentKeys.all(), 'analytics', filters] as const,
  list: (filters: IncidentListFilters) => [...incidentKeys.all(), 'list', filters] as const,
  detail: (id: string) => [...incidentKeys.all(), 'detail', id] as const,
  actions: (id: string) => [...incidentKeys.all(), 'actions', id] as const,
  myActions: () => [...incidentKeys.all(), 'my-actions'] as const,
}
