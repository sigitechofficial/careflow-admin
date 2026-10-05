export const ecmKeys = {
  all: ['ecm'] as const,
  liveDashboard: (filters?: {
    date?: string
    dateFrom?: string
    dateTo?: string
    search?: string
    scheduleAreaId?: string
    locationId?: string
    serviceUserId?: string
  }) => [...ecmKeys.all, 'live-dashboard', filters ?? {}] as const,
  visitsTable: (filters: {
    dateFrom: string
    dateTo: string
    serviceUserId?: string
    employeeId?: string
  }) => [...ecmKeys.all, 'visits-table', filters] as const,
  visitDetail: (jobId: string) => [...ecmKeys.all, 'visit', jobId] as const,
  exceptions: (filters?: { limit?: number; serviceUserId?: string; locationId?: string }) =>
    [...ecmKeys.all, 'exceptions', filters ?? {}] as const,
  visitSos: (jobId: string) => [...ecmKeys.all, 'visit-sos', jobId] as const,
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
  complianceReport: (date?: string, scheduleAreaId?: string, locationId?: string) =>
    [
      ...ecmKeys.all,
      'compliance-report',
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
  thresholdLookups: () => [...ecmKeys.all, 'threshold-lookups'] as const,
}
