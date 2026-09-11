import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  EcmExceptionRow,
  EcmLiveDashboardData,
  EcmReasonCode,
  EcmVisitDetail,
} from '@/features/ecm/types/ecm.types'

export type EcmAuditEventRow = {
  id: string
  scheduledJobId: string | null
  ecmExceptionId: string | null
  eventType: string
  actorUserId: string | null
  summary: string
  detail: unknown
  createdAt: string
}

export type EcmNotificationEvidenceRow = {
  id: string
  scheduledJobId: string
  ecmExceptionId: string | null
  contactName: string | null
  contactRole: string | null
  method: string
  outcome: string
  attemptedAt: string
  etaGiven: string | null
  reasonGiven: string | null
  replacementDetails: string | null
  acceptedDeclined: string | null
  notes: string | null
}

export type EcmHealthData = {
  status: 'HEALTHY' | 'ATTENTION' | 'DEGRADED' | string
  checkedAt: string
  monitorActive: boolean
  signals: {
    evaluationsLastHour: number
    attendanceEventsLastHour: number
    openExceptions: number
    overdueExceptions: number
    lateAlertLogsLast24h: number
  }
  guidance: string
}

export type EcmDailyOpsReportRow = {
  scheduledJobId: string
  jobName: string
  serviceUserName: string
  carerNames?: string[]
  carers?: Array<{ employeeId: string; name: string; isLeadCarer: boolean }>
  localVisitDate?: string
  plannedStartDateTime?: string
  plannedEndDateTime?: string | null
  lifecycleStatus: string
  arrivalClassification: string
  durationClassification: string
  missedClassification: string
  confidence: string
  criticality: string
  startVarianceMinutes: number | null
  durationVarianceMinutes: number | null
  operationalExceptionCodes?: string[]
  exceptionReasons?: string[]
  inExceptionRegister?: boolean
}

export type EcmDailyOpsReport = {
  reportType: string
  date: string
  dateFrom?: string
  dateTo?: string
  refreshedAt: string
  operationalTimezone?: string
  thresholdVersion: string
  definitions?: {
    punctuality?: string
    electronicMonitoring?: string
    exceptionRegister?: string
    opsDay?: string
  }
  kpis: {
    punctuality: {
      numerator: number
      denominator: number
      rate: number | null
      exclusions: Record<string, number>
    }
    electronicMonitoring?: {
      numerator: number
      denominator: number
      rate: number | null
    }
    lateArrivals: number
    earlyArrivals?: number
    shortVisits?: number
    longVisits?: number
    potentialMissed: number
    confirmedMissed: number
    manualAttendance: number
    electronicAttendance?: number
    geofenceBreaches?: number
    verifiedConfidence: number
    totalVisits: number
    exceptionRegisterCount?: number
  }
  classifications?: {
    arrival: {
      onTime: number
      early: number
      late: number
      veryLate: number
      notAssessed: number
      total: number
    }
    duration: {
      onTime: number
      short: number
      long: number
      excessiveOverrun: number
      notAssessed: number
      total: number
    }
  }
  integrity?: {
    verified: number
    partiallyVerified?: number
    manuallyVerified: number
    unverified: number
    disputed: number
    rejected: number
  }
  rows: EcmDailyOpsReportRow[]
  exceptionRegister?: EcmDailyOpsReportRow[]
}

export type EcmComplianceReport = {
  reportType: string
  date: string
  dateFrom?: string
  dateTo?: string
  refreshedAt: string
  operationalTimezone?: string
  thresholdVersion: string
  openExceptions: number
  kpis: EcmDailyOpsReport['kpis']
  integrity: NonNullable<EcmDailyOpsReport['integrity']>
  classifications?: EcmDailyOpsReport['classifications']
  definitions?: EcmDailyOpsReport['definitions']
}

export async function fetchEcmLiveDashboard(params?: {
  date?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  scheduleAreaId?: string
  locationId?: string
  serviceUserId?: string
  limit?: number
  cursor?: string
}): Promise<EcmLiveDashboardData> {
  const qs = new URLSearchParams()
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params?.dateTo) qs.set('dateTo', params.dateTo)
  // Prefer range; keep single `date` for callers that have not migrated yet.
  if (!params?.dateFrom && params?.date) qs.set('date', params.date)
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.scheduleAreaId) qs.set('scheduleAreaId', params.scheduleAreaId)
  if (params?.locationId) qs.set('locationId', params.locationId)
  if (params?.serviceUserId) qs.set('serviceUserId', params.serviceUserId)
  if (params?.limit != null) qs.set('limit', String(params.limit))
  if (params?.cursor) qs.set('cursor', params.cursor)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<EcmLiveDashboardData>>(
    `/ecm/visits/live-dashboard${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchEcmVisitDetail(jobId: string): Promise<EcmVisitDetail> {
  const res = await apiJson<ApiEnvelope<EcmVisitDetail>>(`/ecm/visits/${jobId}`, {
    method: 'GET',
  })
  return res.data
}

export async function reevaluateEcmVisit(jobId: string): Promise<{
  evaluationId: string
  lifecycleStatus: string
  arrivalClassification: string
  timingSummary: string
  appliedSettingsLevel: string
}> {
  const res = await apiJson<
    ApiEnvelope<{
      evaluationId: string
      lifecycleStatus: string
      arrivalClassification: string
      timingSummary: string
      appliedSettingsLevel: string
    }>
  >(`/ecm/visits/${jobId}/evaluate`, { method: 'POST' })
  return res.data
}

export async function fetchEcmExceptions(params?: {
  limit?: number
  serviceUserId?: string
  locationId?: string
}): Promise<EcmExceptionRow[]> {
  const qs = new URLSearchParams()
  qs.set('limit', String(params?.limit ?? 50))
  if (params?.serviceUserId) qs.set('serviceUserId', params.serviceUserId)
  if (params?.locationId) qs.set('locationId', params.locationId)
  const res = await apiJson<ApiEnvelope<EcmExceptionRow[]>>(
    `/ecm/exceptions?${qs.toString()}`,
    { method: 'GET' },
  )
  return res.data
}

export type FcmSendReason =
  | 'SENT'
  | 'FIREBASE_NOT_READY'
  | 'NO_DEVICE_TOKEN'
  | 'NO_EMPLOYEE'
  | 'SEND_FAILED'
  | 'NOT_FIRST_ACK'
  | 'NOT_SOS'

export type FcmSendReport = {
  ready: boolean
  tokens: number
  sent: number
  skipped: number
  reason: FcmSendReason
  error?: string
}

export type AcknowledgeEcmExceptionResult = {
  fcm?: FcmSendReport
}

export async function acknowledgeEcmException(
  id: string,
  note?: string,
): Promise<AcknowledgeEcmExceptionResult> {
  const res = await apiJson<ApiEnvelope<AcknowledgeEcmExceptionResult>>(
    `/ecm/exceptions/${id}/acknowledge`,
    {
      method: 'PATCH',
      body: JSON.stringify({ note: note ?? undefined }),
    },
  )
  return res.data ?? {}
}

export async function resolveEcmException(
  id: string,
  reasonCode: string,
  note?: string,
): Promise<unknown> {
  return apiJson(`/ecm/exceptions/${id}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ reasonCode, note: note ?? undefined }),
  })
}

export async function allowVisitContinue(jobId: string, note?: string): Promise<unknown> {
  return apiJson(`/ecm/visits/${jobId}/allow-continue`, {
    method: 'POST',
    body: JSON.stringify({ note: note?.trim() || undefined }),
  })
}

export async function authoriseCheckInMethodGrant(
  jobId: string,
  grantId: string,
  note?: string,
): Promise<unknown> {
  return apiJson(`/ecm/visits/${jobId}/check-in-method-grants/${grantId}/authorise`, {
    method: 'POST',
    body: JSON.stringify({ note: note?.trim() || undefined }),
  })
}

export async function rejectCheckInMethodGrant(
  jobId: string,
  grantId: string,
  note?: string,
): Promise<unknown> {
  return apiJson(`/ecm/visits/${jobId}/check-in-method-grants/${grantId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note: note?.trim() || undefined }),
  })
}

export async function closeEcmException(id: string, note?: string): Promise<unknown> {
  return apiJson(`/ecm/exceptions/${id}/close`, {
    method: 'PATCH',
    body: JSON.stringify({ note: note ?? undefined }),
  })
}

export async function fetchEcmReasonCodes(): Promise<EcmReasonCode[]> {
  const res = await apiJson<ApiEnvelope<EcmReasonCode[]>>('/ecm/reason-codes', {
    method: 'GET',
  })
  return res.data
}

export async function fetchEcmHealth(): Promise<EcmHealthData> {
  const res = await apiJson<ApiEnvelope<EcmHealthData>>('/ecm/health', { method: 'GET' })
  return res.data
}

export async function fetchEcmDailyOpsReport(
  dateOrRange?: string | { dateFrom?: string; dateTo?: string },
  params?: { scheduleAreaId?: string; locationId?: string },
): Promise<EcmDailyOpsReport> {
  const qs = new URLSearchParams()
  if (typeof dateOrRange === 'string') {
    if (dateOrRange) qs.set('date', dateOrRange)
  } else if (dateOrRange) {
    if (dateOrRange.dateFrom) qs.set('dateFrom', dateOrRange.dateFrom)
    if (dateOrRange.dateTo) qs.set('dateTo', dateOrRange.dateTo)
    // Back-compat for older servers that only read `date`
    if (dateOrRange.dateFrom && !dateOrRange.dateTo) qs.set('date', dateOrRange.dateFrom)
  }
  if (params?.scheduleAreaId) qs.set('scheduleAreaId', params.scheduleAreaId)
  if (params?.locationId) qs.set('locationId', params.locationId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<EcmDailyOpsReport>>(
    `/ecm/reports/daily-operations${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchEcmComplianceReport(
  dateOrRange?: string | { dateFrom?: string; dateTo?: string },
  params?: { scheduleAreaId?: string; locationId?: string },
): Promise<EcmComplianceReport> {
  const qs = new URLSearchParams()
  if (typeof dateOrRange === 'string') {
    if (dateOrRange) qs.set('date', dateOrRange)
  } else if (dateOrRange) {
    if (dateOrRange.dateFrom) qs.set('dateFrom', dateOrRange.dateFrom)
    if (dateOrRange.dateTo) qs.set('dateTo', dateOrRange.dateTo)
    if (dateOrRange.dateFrom && !dateOrRange.dateTo) qs.set('date', dateOrRange.dateFrom)
  }
  if (params?.scheduleAreaId) qs.set('scheduleAreaId', params.scheduleAreaId)
  if (params?.locationId) qs.set('locationId', params.locationId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<EcmComplianceReport>>(
    `/ecm/reports/compliance${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

export type EcmGraphDrillVisit = {
  scheduledJobId: string
  jobName: string
  serviceUserName: string
  plannedStartDateTime: string
  /** Operational calendar day YYYY-MM-DD (organisation timezone). */
  localVisitDate?: string
  hourKey: string
  statusKey: string
  arrivalBand: string
  durationBand: string
  branchName: string | null
  /** Distinct reason codes (exceptions ∪ operationalExceptionCodes). */
  reasonCodes?: string[]
  weekday?: string
  timeBandKey?: string
  verified?: boolean
}

export type EcmGraphDashboardData = {
  dateFrom: string
  dateTo: string
  refreshedAt: string
  visitCount: number
  /** Total evaluations matching filters before row cap (when API supports it). */
  totalMatching?: number
  /** True when visitCount is limited by rowCap. */
  truncated?: boolean
  rowCap?: number
  visitStatusByHour: {
    hours: string[]
    series: Array<{ key: string; label: string; data: number[] }>
  }
  /** Late%/Short%/Missed% by day (assessed denominators for late/short). */
  exceptionTrend: {
    dates: string[]
    series: {
      latePct: number[]
      shortPct: number[]
      missedPct: number[]
    }
    counts?: {
      late: number[]
      short: number[]
      missed: number[]
    }
    denominators?: {
      assessedArrival: number[]
      assessedDuration: number[]
      visits: number[]
    }
  }
  /** Classification SSOT bands: early | on_time | late | very_late | not_assessed */
  arrivalPunctuality: Array<{ key: string; count: number }>
  /** Classification SSOT bands: short | on_time | long | excessive | not_assessed */
  durationVariance: Array<{ key: string; count: number }>
  heatmap: {
    weekdays: string[]
    bands: Array<{
      bandKey: string
      bandLabel: string
      rates: Array<{
        day: string
        total: number
        exceptions: number
        rate: number | null
      }>
    }>
  }
  branchComparison: Array<{
    name: string
    total: number
    assessedArrival?: number
    assessedDuration?: number
    onTimePct: number
    latePct: number
    missedPct: number
    shortPct: number
    verifiedPct: number
  }>
  exceptionReasons: Array<{ code: string; label: string; count: number }>
  drillVisits: EcmGraphDrillVisit[]
}

export async function fetchEcmGraphDashboard(params?: {
  dateFrom?: string
  dateTo?: string
  scheduleAreaId?: string
  locationId?: string
}): Promise<EcmGraphDashboardData> {
  const qs = new URLSearchParams()
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params?.dateTo) qs.set('dateTo', params.dateTo)
  if (params?.scheduleAreaId) qs.set('scheduleAreaId', params.scheduleAreaId)
  if (params?.locationId) qs.set('locationId', params.locationId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<EcmGraphDashboardData>>(
    `/ecm/reports/graph-dashboard${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchEcmAuditTrail(jobId: string): Promise<EcmAuditEventRow[]> {
  const res = await apiJson<ApiEnvelope<EcmAuditEventRow[]>>(
    `/ecm/visits/${jobId}/audit`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchEcmNotifications(
  jobId: string,
): Promise<EcmNotificationEvidenceRow[]> {
  const res = await apiJson<ApiEnvelope<EcmNotificationEvidenceRow[]>>(
    `/ecm/visits/${jobId}/notifications`,
    { method: 'GET' },
  )
  return res.data
}

export async function createEcmNotification(
  jobId: string,
  body: {
    method: string
    outcome?: string
    contactName?: string
    contactRole?: string
    etaGiven?: string
    reasonGiven?: string
    replacementDetails?: string
    acceptedDeclined?: string
    notes?: string
    ecmExceptionId?: string
  },
): Promise<unknown> {
  return apiJson(`/ecm/visits/${jobId}/notifications`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function recordManualAttendance(
  jobId: string,
  body: {
    employeeId: string
    eventType: 'CHECK_IN' | 'CHECK_OUT'
    occurredAt: string
    reasonCode: string
    note?: string
    overrideGeofence?: boolean
  },
): Promise<unknown> {
  return apiJson(`/ecm/visits/${jobId}/manual-attendance`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function amendEcmAttendance(
  jobId: string,
  body: {
    employeeId: string
    eventType: 'CHECK_IN' | 'CHECK_OUT'
    occurredAt: string
    reasonCode: string
    note?: string
    originalEventId?: string
  },
): Promise<unknown> {
  return apiJson(`/ecm/visits/${jobId}/amend-attendance`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function applyMissedTriage(
  jobId: string,
  outcome: string,
  note?: string,
): Promise<unknown> {
  return apiJson(`/ecm/visits/${jobId}/missed-triage`, {
    method: 'PATCH',
    body: JSON.stringify({ outcome, note: note ?? undefined }),
  })
}

export type EcmThresholdLookupRow = {
  id: string
  code: string
  label: string
  description: string | null
  groupCode: string
  relatedTile: string | null
  valueInt: number
  unit: string
  sortOrder: number
  isActive: boolean
}

export async function fetchEcmThresholdLookups(): Promise<EcmThresholdLookupRow[]> {
  const res = await apiJson<ApiEnvelope<EcmThresholdLookupRow[]>>('/ecm/threshold-lookups', {
    method: 'GET',
  })
  return res.data ?? []
}

export async function updateEcmThresholdLookup(
  id: string,
  valueInt: number,
): Promise<EcmThresholdLookupRow> {
  const res = await apiJson<ApiEnvelope<EcmThresholdLookupRow>>(`/ecm/threshold-lookups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ valueInt }),
  })
  return res.data
}
