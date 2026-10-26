import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { CARER_ROTA_CONFLICT_MESSAGE } from '@/features/scheduling/utils/schedule-job-carer-rota-conflict.util'

export { CARER_ROTA_CONFLICT_MESSAGE }

export type BulkVisitPlanScheduleCandidate = {
  serviceUserId: string
  planId: string
  serviceUserLabel: string
  serviceUserNumber: string | null
  locationId: string | null
  locationName: string | null
  enabledSlotCount: number
  ready: boolean
  readinessIssues: string[]
}

export type BulkVisitPlanScheduleCandidatesResponse = {
  candidates: BulkVisitPlanScheduleCandidate[]
  summary: {
    totalActivePlans: number
    readyCount: number
    notReadyCount: number
    returned: number
  }
}

export type BulkVisitPlanScheduleResultItem = {
  serviceUserId: string
  planId: string
  serviceUserLabel: string
  status: 'success' | 'failed' | 'skipped'
  visitsCreated?: number
  visitsSkipped?: number
  visitsWithPatternWarnings?: number
  visitsWithRotaConflicts?: number
  patternWarnings?: string[]
  rotaConflictWarnings?: string[]
  error?: string
  skipReason?: string
  /** The plan has weeks over the service user's weekly contracted hours in this run. */
  weeklyHoursWarning?: string
}

export type BulkGenerateVisitPlanScheduleResponse = {
  fromDate: string
  toDate: string
  backfillDays: number
  totals: {
    processed: number
    succeeded: number
    failed: number
    skipped: number
    visitsCreated: number
    visitsSkipped: number
    visitsWithPatternWarnings: number
    visitsWithRotaConflicts: number
    patternWarnings: string[]
    rotaConflictWarnings: string[]
    /** Plans over a service user's weekly contracted hours (generated or skipped). */
    weeklyHoursWarnings?: string[]
  }
  results: BulkVisitPlanScheduleResultItem[]
}

export async function fetchBulkVisitPlanScheduleCandidates(params?: {
  locationId?: string
  readyOnly?: boolean
}): Promise<BulkVisitPlanScheduleCandidatesResponse> {
  const qs = new URLSearchParams()
  if (params?.locationId) qs.set('locationId', params.locationId)
  if (params?.readyOnly === true) qs.set('readyOnly', 'true')
  if (params?.readyOnly === false) qs.set('readyOnly', 'false')
  const suffix = qs.toString() ? `?${qs}` : ''
  const res = await apiJson<ApiEnvelope<BulkVisitPlanScheduleCandidatesResponse>>(
    `/visit-plan-bulk-schedule/candidates${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

export async function bulkGenerateVisitPlanSchedule(body: {
  fromDate: string
  toDate: string
  scheduleAreaId?: string | null
  backfillDays?: number
  planIds?: string[]
  locationId?: string
  readyOnly?: boolean
}): Promise<BulkGenerateVisitPlanScheduleResponse> {
  const res = await apiJson<ApiEnvelope<BulkGenerateVisitPlanScheduleResponse>>(
    '/visit-plan-bulk-schedule/generate',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}
