export const bodyMapKeys = {
  all: ['body-map'] as const,
  list: (serviceUserId: string, includeResolved?: boolean) =>
    [...bodyMapKeys.all, 'list', serviceUserId, includeResolved ?? false] as const,
  summary: (serviceUserId: string) => [...bodyMapKeys.all, 'summary', serviceUserId] as const,
  alerts: (serviceUserId: string) => [...bodyMapKeys.all, 'alerts', serviceUserId] as const,
  detail: (recordId: string) => [...bodyMapKeys.all, 'detail', recordId] as const,
  audit: (recordId: string) => [...bodyMapKeys.all, 'audit', recordId] as const,
  reviewQueue: (overdueOnly?: boolean, serviceUserId?: string, locationId?: string) =>
    [
      ...bodyMapKeys.all,
      'review-queue',
      overdueOnly ?? false,
      serviceUserId ?? '',
      locationId ?? '',
    ] as const,
  governanceAlerts: () => [...bodyMapKeys.all, 'governance-alerts'] as const,
  lookups: () => [...bodyMapKeys.all, 'lookups'] as const,
}
