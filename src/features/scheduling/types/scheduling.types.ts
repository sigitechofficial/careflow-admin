export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages?: number
}

export type ServiceUserBrief = {
  id: string
  firstName: string
  lastName: string
  preferredName?: string | null
  serviceUserNumber?: string | null
}

export type ScheduleRunBrief = {
  id: string
  name: string
  runDate: string
  startTime?: string | null
  endTime?: string | null
  sortOrder?: number
}

export type TimelineJob = {
  id: string
  jobName: string
  status: string
  serviceUserId: string
  serviceUser: ServiceUserBrief
  scheduledStartDateTime: string
  scheduledEndDateTime: string | null
  durationMinutes?: number
  requiredCarers: number
  scheduleRunId?: string | null
  scheduleRun?: ScheduleRunBrief | null
  scheduleArea?: { id: string; name: string; code: string } | null
  allocations: Array<{
    id: string
    employeeId: string
    status: string
    employee: {
      id: string
      firstName?: string
      lastName?: string
      email?: string | null
    } | null
  }>
}

export type JobsDayRunsResponse = {
  date: string
  runs: Array<{ run: ScheduleRunBrief; jobs: TimelineJob[] }>
  unassignedJobs: TimelineJob[]
}

export type HousekeepingJob = TimelineJob & {
  visits?: Array<{
    id: string
    visitName: string
    status: string
    scheduledStartDateTime: string
    scheduledEndDateTime: string | null
    actualStartDateTime: string | null
    actualEndDateTime: string | null
  }>
  actualStartDateTime?: string | null
  actualEndDateTime?: string | null
  employees?: Array<{ allocationId: string; status: string; employee: unknown }>
  attentionReasons?: string[]
}

export type ReportTypeRow = {
  type: string
  name: string
  supported: boolean
  endpoint: string | null
  message: string | null
}

export type ScheduleAreaRow = {
  id: string
  name: string
  code: string
  description?: string | null
}

export type ScheduleStatusResponse = {
  scheduleDate: string
  batch: { id: string; status: string; scheduleDate: string } | null
  areas: Array<{
    scheduleAreaId: string
    scheduleArea: ScheduleAreaRow
    status: string
    builtAt?: string | null
  }>
}

export type CallOffVisitRow = {
  id: string
  callOffDate: string
  reason: string
  notes?: string | null
  status: string
  serviceUser: ServiceUserBrief
  scheduledJob?: { id: string; jobName: string; status: string } | null
}

export type DateRangeQuery = {
  dateFrom: string
  dateTo: string
  page?: number
  limit?: number
  serviceUserId?: string
  employeeId?: string
  scheduleBatchId?: string
  scheduleAreaId?: string
  includeCancelled?: boolean
  export?: boolean
}
