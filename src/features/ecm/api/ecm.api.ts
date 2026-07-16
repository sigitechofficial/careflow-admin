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

export type EcmDailyOpsReport = {
  reportType: string
  date: string
  refreshedAt: string
  thresholdVersion: string
  kpis: {
    punctuality: {
      numerator: number
      denominator: number
      rate: number | null
      exclusions: Record<string, number>
    }
    lateArrivals: number
    potentialMissed: number
    confirmedMissed: number
    manualAttendance: number
    verifiedConfidence: number
    totalVisits: number
  }
  rows: Array<{
    scheduledJobId: string
    jobName: string
    serviceUserName: string
    lifecycleStatus: string
    arrivalClassification: string
    durationClassification: string
    missedClassification: string
    confidence: string
    criticality: string
    startVarianceMinutes: number | null
    durationVarianceMinutes: number | null
  }>
}

export async function fetchEcmLiveDashboard(params?: {
  date?: string
  search?: string
  scheduleAreaId?: string
  serviceUserId?: string
  limit?: number
}): Promise<EcmLiveDashboardData> {
  const qs = new URLSearchParams()
  if (params?.date) qs.set('date', params.date)
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.scheduleAreaId) qs.set('scheduleAreaId', params.scheduleAreaId)
  if (params?.serviceUserId) qs.set('serviceUserId', params.serviceUserId)
  if (params?.limit != null) qs.set('limit', String(params.limit))
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

export async function fetchEcmExceptions(limit = 50): Promise<EcmExceptionRow[]> {
  const res = await apiJson<ApiEnvelope<EcmExceptionRow[]>>(
    `/ecm/exceptions?limit=${limit}`,
    { method: 'GET' },
  )
  return res.data
}

export async function acknowledgeEcmException(id: string, note?: string): Promise<unknown> {
  return apiJson(`/ecm/exceptions/${id}/acknowledge`, {
    method: 'PATCH',
    body: JSON.stringify({ note: note ?? undefined }),
  })
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

export async function fetchEcmDailyOpsReport(date?: string): Promise<EcmDailyOpsReport> {
  const qs = date ? `?date=${encodeURIComponent(date)}` : ''
  const res = await apiJson<ApiEnvelope<EcmDailyOpsReport>>(
    `/ecm/reports/daily-operations${qs}`,
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
