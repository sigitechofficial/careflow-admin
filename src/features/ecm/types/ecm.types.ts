export type EcmLifecycleStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'DUE'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'CHECKED_OUT'
  | 'COMPLETED'
  | 'COMPLETED_WITH_EXCEPTION'
  | 'CLOSED'

export type EcmArrivalClassification =
  | 'EARLY_ARRIVAL'
  | 'ON_TIME'
  | 'LATE_ARRIVAL'
  | 'VERY_LATE_ARRIVAL'
  | 'NOT_ASSESSED'

export type EcmDepartureClassification =
  | 'EARLY_DEPARTURE'
  | 'ON_TIME'
  | 'LATE_DEPARTURE'
  | 'NOT_ASSESSED'

export type EcmDurationClassification =
  | 'SHORT_VISIT'
  | 'ON_TIME'
  | 'LONG_VISIT'
  | 'EXCESSIVE_OVERRUN'
  | 'NOT_ASSESSED'

export type EcmMissedClassification =
  | 'NONE'
  | 'POTENTIAL_MISSED'
  | 'ATTENDANCE_VERIFICATION_PENDING'
  | 'CONFIRMED_MISSED'
  | 'FALSE_ECM_ALERT'
  | 'DISPUTED'

export type EcmAttendanceConfidence =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'MANUALLY_VERIFIED'
  | 'UNVERIFIED'
  | 'DISPUTED'
  | 'REJECTED'

export type EcmCriticality = 'STANDARD' | 'PRIORITY' | 'TIME_CRITICAL'

export type EcmSettingsLevel =
  | 'PLATFORM'
  | 'ORGANISATION'
  | 'BRANCH'
  | 'CONTRACT'
  | 'SERVICE_USER'
  | 'VISIT_TEMPLATE'
  | 'VISIT'

export type EcmDashboardBucket =
  | 'dueNow'
  | 'startingSoon'
  | 'inProgress'
  | 'earlyArrival'
  | 'lateArrival'
  | 'veryLateArrival'
  | 'potentialMissed'
  | 'confirmedMissed'
  | 'missingCheckout'
  | 'outsideGeofence'
  | 'manualAttendance'
  | 'completed'
  | 'completedOnTime'
  | 'completedLate'

export type EcmLiveVisitRow = {
  scheduledJobId: string
  scheduledVisitId: string | null
  jobName: string
  slotLabel?: string | null
  serviceUserId: string
  serviceUserName: string
  carers?: Array<{ employeeId: string; name: string; isLeadCarer: boolean }>
  address?: string | null
  postcode?: string | null
  plannedStartDateTime: string
  plannedEndDateTime: string | null
  actualCheckInAt: string | null
  actualCheckOutAt: string | null
  plannedDurationMinutes?: number | null
  actualDurationMinutes?: number | null
  lifecycleStatus: EcmLifecycleStatus | string
  arrivalClassification: EcmArrivalClassification | string
  departureClassification?: EcmDepartureClassification | string
  durationClassification: EcmDurationClassification | string
  missedClassification: EcmMissedClassification | string
  confidence: EcmAttendanceConfidence | string
  criticality: EcmCriticality | string
  startVarianceMinutes: number | null
  endVarianceMinutes?: number | null
  durationVarianceMinutes: number | null
  appliedSettingsLevel: EcmSettingsLevel | string
  operationalExceptionCodes: string[]
  buckets: EcmDashboardBucket[]
}

export type EcmLiveDashboardCounts = Record<EcmDashboardBucket, number> & {
  total: number
}

/** Day-level ops summary from live dashboard (same day as tiles). */
export type EcmLiveDashboardSummary = {
  total: number
  completed: number
  completedOnTime: number
  completedLate: number
  completedOnTimePct: number | null
  outstanding: number
  inProgress: number
  potentialMissed: number
  confirmedMissed: number
  missingCheckout: number
  missingCheckIn: number
}

export type EcmLiveDashboardData = {
  date: string
  dateFrom?: string
  dateTo?: string
  operationalToday?: string
  operationalTimezone?: string
  refreshedAt: string
  windows?: {
    dueNowWindowMinutes: number
    startingSoonMinutes: number
    earlyArrivalToleranceMinutes: number
    lateArrivalToleranceMinutes: number
    veryLateThresholdMinutes: number
    missedVisitThresholdMinutes: number
    geofenceRadiusMeters: number
  }
  counts: EcmLiveDashboardCounts
  summary?: EcmLiveDashboardSummary
  /** Total evaluations in the period (independent of page). */
  total?: number
  nextCursor?: string | null
  visits: EcmLiveVisitRow[]
}

export type EcmAttendanceEvent = {
  id: string
  eventType: string
  verificationMethod: string
  occurredAt: string
  deviceCapturedAt: string | null
  latitude: number | null
  longitude: number | null
  accuracyMeters: number | null
  isMockLocation: boolean
  outsideGeofence: boolean
  outsideGeofenceReason: string | null
  distanceMeters: number | null
  identityConfirmed: boolean
  employeeId: string
  clientEventId: string | null
  createdAt: string
}

export type EcmScheduleChangeClass =
  | 'ORIGINAL'
  | 'PLANNED'
  | 'SERVICE_USER_REQUESTED'
  | 'PROVIDER_REQUESTED'
  | 'EMERGENCY'
  | 'SAME_DAY'
  | 'LATE_NOTICE'
  | 'RETROSPECTIVE'
  | 'UNAUTHORISED'

export type EcmScheduleVersionRow = {
  id: string
  scheduledJobId: string
  versionNumber: number
  isOriginal: boolean
  changeClass: EcmScheduleChangeClass | string
  plannedStartDateTime: string
  plannedEndDateTime: string | null
  previousStartDateTime: string | null
  previousEndDateTime: string | null
  reasonCode: string | null
  reasonNote: string | null
  changedById: string | null
  changedAt: string
  serviceUserAgreed: boolean | null
  serviceUserInformed: boolean | null
  informedAt: string | null
  agreedAt: string | null
  beforeDueTime: boolean
  lateNotice: boolean
  retrospective: boolean
  managerApproved: boolean | null
  managerApprovedById: string | null
  managerApprovedAt: string | null
  commissionerAuthorised: boolean | null
  createdAt: string
}

export type EcmScheduleHistory = {
  scheduledJobId: string
  original: EcmScheduleVersionRow | null
  current: EcmScheduleVersionRow | null
  versions: EcmScheduleVersionRow[]
}

export type EcmVisitDetail = {
  scheduledJobId: string
  jobName: string
  jobStatus: string
  serviceUser: { id: string; name: string }
  location: { address: string | null; postcode: string | null }
  allocatedCarers: Array<{
    allocationId: string
    employeeId: string
    isLeadCarer: boolean
    status: string
    name: string
  }>
  visit: {
    id: string
    status: string
    actualStartDateTime: string | null
    actualEndDateTime: string | null
    visitPlanSlot: {
      id: string
      timeCritical: boolean
      timeToleranceMinutes: number
      slotKind: string
    } | null
  } | null
  ecm: {
    evaluationId: string
    lifecycleStatus: string
    criticality: string
    confidence: string
    missedClassification: string
    operationalExceptionCodes: string[]
    planned: {
      start: string
      end: string | null
      durationMinutes: number | null
      earliestPermittedStart: string | null
      latestPermittedStart: string | null
      localVisitDate: string
      timezone: string
      requiredCarers: number
    }
    actual: {
      checkInAt: string | null
      checkOutAt: string | null
      durationMinutes: number | null
    }
    timing: {
      startVarianceMinutes: number | null
      endVarianceMinutes: number | null
      durationVarianceMinutes: number | null
      arrivalClassification: string
      departureClassification: string
      durationClassification: string
      summary: string
    }
    appliedSettings: {
      level: string
      thresholdRuleVersion: string | null
      lateArrivalToleranceMinutes: number
      veryLateThresholdMinutes: number
      shortVisitToleranceMinutes: number
      longVisitToleranceMinutes: number
      excessiveOverrunMinutes: number
      missedVisitThresholdMinutes: number
      geofenceRadiusMeters: number | null
    }
    evaluatedAt: string
  }
  attendanceEvents: EcmAttendanceEvent[]
  /** Present after BE1.25 schedule versioning is applied. */
  scheduleHistory?: EcmScheduleHistory | null
}

export type EcmExceptionLifecycle =
  | 'DETECTED'
  | 'ALERT_GENERATED'
  | 'ASSIGNED'
  | 'ACKNOWLEDGED'
  | 'INVESTIGATING'
  | 'ACTION_TAKEN'
  | 'RESOLVED'
  | 'MANAGER_REVIEWED'
  | 'CLOSED'

export type EcmExceptionKind =
  | 'LATE_ARRIVAL'
  | 'VERY_LATE_ARRIVAL'
  | 'EARLY_ARRIVAL'
  | 'EARLY_DEPARTURE'
  | 'SHORT_VISIT'
  | 'LONG_VISIT'
  | 'EXCESSIVE_OVERRUN'
  | 'POTENTIAL_MISSED'
  | 'CONFIRMED_MISSED'
  | 'MISSING_CHECKOUT'
  | 'OUTSIDE_GEOFENCE'
  | 'MANUAL_ATTENDANCE'
  | 'MOCK_LOCATION'
  | 'OTHER'

export type EcmExceptionRow = {
  id: string
  scheduledJobId: string
  kind: EcmExceptionKind | string
  lifecycle: EcmExceptionLifecycle | string
  title: string
  detail: string | null
  overdue: boolean
  responseTargetMinutes: number | null
  escalationDeadlineAt: string | null
  acknowledgedAt: string | null
  createdAt: string
  jobName: string
  /** Scheduled job status when returned by open-exception list. */
  jobStatus?: string
  /** YYYY-MM-DD from scheduled start (for schedule-jobs deep link). */
  plannedDate?: string
  plannedStartDateTime?: string
  plannedEndDateTime?: string | null
  carers?: Array<{ employeeId: string; name: string; isLeadCarer: boolean }>
  serviceUserId?: string
  serviceUserName: string
}

export type EcmReasonCode = {
  code: string
  category: 'LATE' | 'SHORT' | 'LONG' | 'MISSED' | 'CANCEL' | 'AMEND' | 'SCHEDULE' | 'OTHER'
  label: string
}
