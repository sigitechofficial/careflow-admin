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
  | 'leftVisitArea'
  | 'completed'
  | 'completedOnTime'
  | 'completedLate'

/** Per-carer timing — set on double-up visits only. */
export type EcmCarerTiming = {
  /** This carer's own planned start (assignment time, else the visit time). */
  plannedStartDateTime?: string
  checkInAt?: string | null
  checkOutAt?: string | null
  /** Minutes after own planned start, only when beyond the late tolerance. */
  lateArrivalMinutes?: number | null
  notClockedIn?: boolean
}

export type EcmLiveVisitCarer = {
  employeeId: string
  name: string
  isLeadCarer: boolean
} & EcmCarerTiming

export type EcmLiveVisitRow = {
  scheduledJobId: string
  scheduledVisitId: string | null
  /** Visit ID shown on the carer app (VIS-…). */
  visitRef?: string | null
  jobName: string
  slotLabel?: string | null
  serviceUserId: string
  serviceUserName: string
  carers?: EcmLiveVisitCarer[]
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
  /** How the visit was clocked in. */
  checkInMethod?: 'GPS' | 'NFC' | 'QR' | 'MANUAL' | 'OFFICE' | 'NONE'
  /** e.g. "GPS", "NFC tag · Main tag", "Manual (carer)", "Office (manual)". */
  checkInMethodLabel?: string
}

/** ECM visit rows for one service user or employee over a date range. */
export type EcmVisitsTableData = {
  dateFrom: string
  dateTo: string
  operationalTimezone: string
  rows: EcmLiveVisitRow[]
  /** More visits exist than one request returns. */
  truncated: boolean
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
  /** Office label, e.g. "GPS", "NFC tag · Main tag", "Manual (carer)". */
  methodLabel?: string
  occurredAt: string
  deviceCapturedAt: string | null
  /** When the server received the event. */
  receivedAt?: string | null
  /** The server received it well after it happened on the phone (offline clock-in/out). */
  syncedLate?: boolean
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

export type EcmCheckInMethodGrant = {
  id: string
  scheduledJobId: string
  employeeId: string
  employeeName: string | null
  operationalDay: string
  status: 'PENDING' | 'AUTHORISED' | 'REJECTED' | 'CONSUMED' | string
  carerNote: string | null
  officeNote: string | null
  officeReasonId?: string | null
  latitude: number | null
  longitude: number | null
  accuracyMeters: number | null
  distanceMeters: number | null
  isMockedLocation: boolean
  locationUnavailable: boolean
  requestedAt: string
  expiresAt: string
  decidedAt: string | null
  decidedById: string | null
  decidedByName: string | null
  consumedAt: string | null
  ecmExceptionId: string | null
  manualEnabled: boolean
}

export type EcmVisitDetail = {
  scheduledJobId: string
  jobName: string
  jobStatus: string
  serviceUser: { id: string; name: string }
  location: { address: string | null; postcode: string | null }
  allocatedCarers: Array<
    {
      allocationId: string
      employeeId: string
      isLeadCarer: boolean
      status: string
      name: string
      plannedEndDateTime?: string | null
    } & EcmCarerTiming
  >
  visit: {
    id: string
    status: string
    actualStartDateTime: string | null
    actualEndDateTime: string | null
    /** Same Visit ID as the carer app (EMONITORED VIS-…). */
    visitRef?: string | null
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
  checkInMethodGrants?: EcmCheckInMethodGrant[]
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
  | 'LEFT_VISIT_AREA'
  | 'MANUAL_ATTENDANCE'
  | 'MOCK_LOCATION'
  | 'CARER_SOS'
  | 'OUTSIDE_AREA_CHECK_IN_REQUEST'
  | 'UNABLE_TO_START'
  | 'NFC_TAG_MISMATCH'
  | 'OTHER'

export type CarerSosAlertDto = {
  id: string
  createdAt: string
  lifecycle: string
  title: string
  message: string | null
  latitude: number | null
  longitude: number | null
  accuracyMeters: number | null
  locationUnavailable: boolean
  isMockedLocation?: boolean
  employeeId: string
  employeeName: string
  acknowledgedAt?: string | null
  acknowledgedById?: string | null
  acknowledgedByName?: string | null
  actionCode?: string | null
  actionLabel?: string | null
  actionNote?: string | null
  outcomeCode?: string | null
  outcomeLabel?: string | null
  resolutionNote?: string | null
  closedAt?: string | null
  closedByName?: string | null
}

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
  acknowledgedById?: string | null
  acknowledgedByName?: string | null
  createdAt: string
  jobName: string
  /** Same “Visit ID” shown on the carer app (EMONITORED VIS-…). */
  visitRef?: string | null
  /** Scheduled job status when returned by open-exception list. */
  jobStatus?: string
  /** YYYY-MM-DD from scheduled start (for schedule-jobs deep link). */
  plannedDate?: string
  plannedStartDateTime?: string
  plannedEndDateTime?: string | null
  carers?: Array<{ employeeId: string; name: string; isLeadCarer: boolean }>
  serviceUserId?: string
  serviceUserName: string
  clockedInAt?: string | null
  /** True when any check-in or check-out on this visit used a mock GPS. */
  hasMockLocation?: boolean
  areaLock?: {
    status: 'LOCKED' | 'ALLOWED' | string
    lockedAt: string
    allowedAt: string | null
    allowedByName: string | null
    allowNote: string | null
    employeeId: string
    latitude?: number | null
    longitude?: number | null
    distanceMeters?: number | null
  } | null
  /** GPS from the visit CHECK_IN attendance event. */
  checkInLocation?: {
    latitude: number
    longitude: number
    accuracyMeters: number | null
    distanceMeters: number | null
    outsideGeofence: boolean
    isMockLocation: boolean
    occurredAt: string
    employeeId: string
    /** How the carer clocked in, e.g. NFC-verified while GPS was outside the area. */
    methodCode?: 'GPS' | 'NFC' | 'QR' | 'MANUAL' | 'OFFICE' | 'NONE' | null
    methodLabel?: string | null
  } | null
  sos?: CarerSosAlertDto | null
  checkInMethodRequest?: EcmCheckInMethodGrant | null
}

export type EcmReasonCode = {
  code: string
  category: 'LATE' | 'SHORT' | 'LONG' | 'MISSED' | 'CANCEL' | 'AMEND' | 'SCHEDULE' | 'SOS' | 'OTHER'
  label: string
  requiresNotes?: boolean
}
