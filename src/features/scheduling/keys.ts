export const schedulingKeys = {
  all: () => ['scheduling'] as const,

  areas: () => [...schedulingKeys.all(), 'areas'] as const,

  status: (date: string) => [...schedulingKeys.all(), 'status', date] as const,

  dayRuns: (date: string) => [...schedulingKeys.all(), 'day-runs', date] as const,

  list: (date: string) => [...schedulingKeys.all(), 'list', date] as const,

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
} as const
