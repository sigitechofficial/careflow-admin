export const schedulingKeys = {
  all: () => ['scheduling'] as const,

  areas: () => [...schedulingKeys.all(), 'areas'] as const,

  status: (date: string) => [...schedulingKeys.all(), 'status', date] as const,

  dayRuns: (date: string) => [...schedulingKeys.all(), 'day-runs', date] as const,
  serviceUsersWeek: (weekStart: string) => [...schedulingKeys.all(), 'service-users-week', weekStart] as const,

  list: (date: string) => [...schedulingKeys.all(), 'list', date] as const,

  employeesDay: (date: string) => [...schedulingKeys.all(), 'employees-day', date] as const,

  employeesMonth: (month: string, employeeId?: string) =>
    [...schedulingKeys.all(), 'employees-month', month, employeeId ?? 'all'] as const,

  reportTypes: () => [...schedulingKeys.all(), 'report-types'] as const,

  report: (endpoint: string, from: string, to: string, generate: boolean) =>
    [...schedulingKeys.all(), 'report', endpoint, from, to, generate] as const,

  housekeeping: () => [...schedulingKeys.all(), 'housekeeping'] as const,

  housekeepingNotStarted: (page: number) =>
    [...schedulingKeys.housekeeping(), 'not-started', page] as const,

  housekeepingAttention: (page: number) =>
    [...schedulingKeys.housekeeping(), 'attention', page] as const,

  housekeepingDay: (date: string, page: number) =>
    [...schedulingKeys.housekeeping(), 'day', date, page] as const,

  runs: (params: { runDate?: string; employeeId?: string; status?: string }) =>
    [...schedulingKeys.all(), 'runs', params] as const,

  runDetail: (id: string) => [...schedulingKeys.all(), 'run', id] as const,

  job: (id: string) => [...schedulingKeys.all(), 'job', id] as const,

  careConsents: (jobId: string) => [...schedulingKeys.all(), 'care-consents', jobId] as const,

  bulkCandidates: (params: { locationId?: string; readyOnly?: boolean }) =>
    [...schedulingKeys.all(), 'bulk-candidates', params] as const,
} as const
