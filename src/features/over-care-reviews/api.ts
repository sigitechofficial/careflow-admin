import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

/** Workforce › Over care reviews (backend: service-user-over-care.controller.ts). */

export type OverCareReviewStatus = 'PENDING' | 'ACTION_TAKEN' | 'NO_ACTION_NEEDED'

export type OverCareReviewRow = {
  id: string
  serviceUserId: string
  serviceUserName: string
  /** Monday of the week that got the over care (yyyy-mm-dd). */
  weekStart: string
  weeklyMinutes: number
  careGivenMinutes: number
  overMinutes: number
  status: OverCareReviewStatus
  raisedAt: string
  decidedAt: string | null
  cancelledVisits: number
  cancelledMinutes: number
}

export type OverCareReviewList = {
  counts: Record<OverCareReviewStatus, number>
  rows: OverCareReviewRow[]
}

export type OverCareVisitChecks = {
  medicationDue: boolean
  criticalTasks: string[]
  timeCriticalTasks: string[]
}

export type OverCareUpcomingVisit = {
  scheduledJobId: string
  date: string
  start: string
  end: string
  label: string
  minutes: number
  status: string
  carers: string[]
  kind: 'PLAN' | 'EXTRA' | 'SPECIAL'
  checks: OverCareVisitChecks
}

export type OverCareCancelledVisit = {
  scheduledJobId: string
  date: string
  start: string
  end: string
  label: string
  minutes: number
  status: string
  carers: string[]
}

export type OverCarePerson = { kind: 'SYSTEM' | 'USER'; name: string | null }

export type OverCareReviewDetail = {
  id: string
  status: OverCareReviewStatus
  serviceUser: { id: string; name: string }
  weekStart: string
  weeklyMinutes: number
  careGivenMinutes: number
  excludedMinutes: number
  overMinutes: number
  raisedAt: string
  raisedBy: OverCarePerson
  decidedAt: string | null
  decidedBy: OverCarePerson | null
  decisionNote: string | null
  cancelledMinutes: number
  takenBackMinutes: number
  notTakenBackMinutes: number
  cancelledVisits: OverCareCancelledVisit[]
  overWeekVisits: Array<{
    jobId: string
    label: string
    day: string
    start: string
    end: string | null
    plannedMinutes: number
    givenMinutes: number
    /** Cancelled late and charged to the service user: counts as care given. */
    chargeableCancellation?: boolean
  }>
  upcomingWeeks: Array<{ weekStart: string; minutes: number; visits: OverCareUpcomingVisit[] }>
}

const BASE = '/service-user-hours/over-care-reviews'

export async function fetchOverCareReviews(status: OverCareReviewStatus): Promise<OverCareReviewList> {
  const res = await apiJson<ApiEnvelope<OverCareReviewList>>(`${BASE}?status=${status}`, { method: 'GET' })
  return res.data
}

export async function fetchOverCareReview(id: string): Promise<OverCareReviewDetail> {
  const res = await apiJson<ApiEnvelope<OverCareReviewDetail>>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'GET',
  })
  return res.data
}

export async function cancelOverCareVisits(
  id: string,
  body: { scheduledJobIds: string[]; note?: string },
): Promise<OverCareReviewDetail> {
  const res = await apiJson<ApiEnvelope<OverCareReviewDetail>>(
    `${BASE}/${encodeURIComponent(id)}/cancel-visits`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function markOverCareNoAction(id: string, reason: string): Promise<OverCareReviewDetail> {
  const res = await apiJson<ApiEnvelope<OverCareReviewDetail>>(`${BASE}/${encodeURIComponent(id)}/no-action`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  return res.data
}
