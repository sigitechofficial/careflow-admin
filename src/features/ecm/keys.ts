export const ecmKeys = {
  all: ['ecm'] as const,
  liveDashboard: (filters?: {
    date?: string
    search?: string
    scheduleAreaId?: string
    locationId?: string
    serviceUserId?: string
  }) => [...ecmKeys.all, 'live-dashboard', filters ?? {}] as const,
  visitDetail: (jobId: string) => [...ecmKeys.all, 'visit', jobId] as const,
  exceptions: (limit?: number) => [...ecmKeys.all, 'exceptions', limit ?? 50] as const,
  reasonCodes: () => [...ecmKeys.all, 'reason-codes'] as const,
  health: () => [...ecmKeys.all, 'health'] as const,
  dailyOps: (date?: string, scheduleAreaId?: string, locationId?: string) =>
    [
      ...ecmKeys.all,
      'daily-ops',
      date ?? 'today',
      scheduleAreaId ?? 'all',
      locationId ?? 'all',
    ] as const,
  graphDashboard: (filters?: {
    dateFrom?: string
    dateTo?: string
    scheduleAreaId?: string
    locationId?: string
  }) => [...ecmKeys.all, 'graph-dashboard', filters ?? {}] as const,
  audit: (jobId: string) => [...ecmKeys.all, 'audit', jobId] as const,
  notifications: (jobId: string) => [...ecmKeys.all, 'notifications', jobId] as const,
}
