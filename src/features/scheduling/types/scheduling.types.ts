export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages?: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

export type ServiceUserBrief = {
  id: string
  firstName: string
  lastName: string
  preferredName?: string | null
  serviceUserNumber?: string | null
  locationId?: string | null
  location?: { id: string; name: string } | null
  zoneName?: string | null
  branchName?: string | null
  branchLayers?: string[]
  displayLabel?: string | null
  address?: {
    addressLine1?: string | null
    addressLine2?: string | null
    town?: string | null
    county?: string | null
    postcode?: string | null
  } | null
  latitude?: number | null
  longitude?: number | null
}

export type ScheduleRunStatus = 'DRAFT' | 'PUBLISHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type ScheduleRunBrief = {
  id: string
  name: string
  runDate: string
  startTime?: string | null
  endTime?: string | null
  sortOrder?: number
  status?: ScheduleRunStatus
  shiftType?: string | null
  employeeId?: string | null
}

export type ScheduleRunEmployeeBrief = {
  id: string
  firstName?: string
  lastName?: string
  email?: string | null
}

export type ScheduleRunRow = {
  id: string
  scheduleBatchId: string
  scheduleAreaId?: string | null
  employeeId?: string | null
  name: string
  description?: string | null
  runDate: string
  startTime?: string | null
  endTime?: string | null
  shiftType?: string | null
  status: ScheduleRunStatus
  sortOrder?: number
  isActive?: boolean
  jobCount?: number
  createdAt?: string
  updatedAt?: string
  employee?: ScheduleRunEmployeeBrief | null
  jobs?: Array<TimelineJob & { runSequence?: number | null }>
}

export type VisitPlanJobContext = {
  slotId: string
  slotCode: string
  label: string
  linkedCarePlanFormIds: string[]
  plannedStartTime?: string
  plannedEndTime?: string
  durationMinutes?: number | null
  requiredCarers?: number
  scheduleFrequency?: string
  daysOfWeek?: number[]
  medicationRoundCode?: string | null
  isEnabled?: boolean
  timeCritical?: boolean
  timeToleranceMinutes?: number
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
  allocatedCarers?: number
  underAllocated?: boolean
  serviceUserAbsent?: boolean
  carersOnLeave?: string[]
  needsCover?: boolean
  visitPlan?: VisitPlanJobContext | null
  visits?: Array<{
    id: string
    visitName: string
    visitPlanSlotId: string | null
    status?: string
    scheduledStartDateTime?: string
    scheduledEndDateTime?: string | null
    actualStartDateTime?: string | null
    actualEndDateTime?: string | null
  }>
  actualStartDateTime?: string | null
  actualEndDateTime?: string | null
  /** Derived lifecycle / timing / duration classification (API or client). */
  deliveryAssessment?: import('@/features/scheduling/utils/visit-delivery-assessment.util').VisitDeliveryAssessment
  timingException?: {
    reasonCode?: string | null
    reasonLabel?: string | null
    notes?: string | null
    overrunReason?: string | null
  } | null
  cancellation?: {
    reasonCode?: string | null
    reasonNotes?: string | null
    outcome?: string | null
  } | null
  attendanceEvents?: Array<{
    id: string
    eventType: string
    occurredAt: string
    verificationMethod?: string
    outsideGeofence?: boolean
    outsideGeofenceReason?: string | null
  }>
  scheduleRunId?: string | null
  runSequence?: number | null
  scheduleRun?: ScheduleRunBrief | null
  scheduleArea?: { id: string; name: string; code: string; locationId?: string | null } | null
  allocations: Array<{
    id: string
    employeeId: string
    status: string
    isLeadCarer?: boolean
    requiresConfirmation?: boolean
    scheduledStartDateTime?: string | null
    scheduledEndDateTime?: string | null
    durationMinutes?: number | null
    actualStartDateTime?: string | null
    actualEndDateTime?: string | null
    resolvedStartDateTime?: string | null
    resolvedEndDateTime?: string | null
    resolvedDurationMinutes?: number | null
    hasExplicitTiming?: boolean
    employee: {
      id: string
      firstName?: string
      lastName?: string
      email?: string | null
    } | null
  }>
  notes?: string | null
  address?: string | null
  postcode?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type JobsDayRunsResponse = {
  date: string
  runs: Array<{ run: ScheduleRunBrief; jobs: TimelineJob[] }>
  unassignedJobs: TimelineJob[]
}

export type EmployeeBrief = {
  id: string
  firstName?: string
  lastName?: string
  email?: string | null
  role?: { id: string; name: string } | null
  jobTitle?: { id: string; name: string } | null
  contractedWeeklyHours?: number | null
  maximumWeeklyHours?: number | null
  isBankStaff?: boolean
  isAgencyStaff?: boolean
}

export type EmployeeDayAllocation = {
  id: string
  status: string
  job: TimelineJob
}

export type EmployeeDayPattern = {
  isAvailable: boolean
  startTime: string | null
  endTime: string | null
  isPartial: boolean
}

export type EmployeeDayRow = {
  employee: EmployeeBrief
  allocations: EmployeeDayAllocation[]
  totalMinutes: number
  dayPattern?: EmployeeDayPattern | null
  /** True when the carer has approved leave covering this timeline day. */
  onHoliday?: boolean
  holidayEndDate?: string | null
}

export type EmployeesDayTimelineResponse = {
  date: string
  employees: EmployeeDayRow[]
}

export type EmployeesMonthTimelineResponse = {
  month: string
  employees: EmployeeDayRow[]
}

export type ServiceUsersWeekTimelineResponse = {
  weekStart: string
  weekEnd: string
  serviceUsers: Array<{
    serviceUser: ServiceUserBrief
    jobs: TimelineJob[]
  }>
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
  location?: { id: string; name: string } | null
  zone?: { id: string; name: string } | null
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
