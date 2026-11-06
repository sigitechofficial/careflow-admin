import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type EmployeeReviewRow = {
  id: string
  employeeId: string
  reviewTypeId: string | null
  status: string | null
  lastDone: string | null
  nextDue: string | null
  notes: string | null
  /** Supporting document (stored in employee Documents). */
  documentUrl: string | null
  reviewedById: string | null
  reviewedBy?: { id: string; firstName: string | null; lastName: string | null; email: string } | null
  createdAt?: string
  updatedAt?: string
  reviewType?: {
    id: string
    name: string
    code: string | null
    defaultIntervalDays: number | null
  } | null
}

export type EmployeeReviewOverviewRow = EmployeeReviewRow & {
  employee?: {
    id: string
    personalDetail?: {
      firstName: string
      lastName: string
      username: string | null
    } | null
  } | null
}

/** Due from a review type's schedule with nothing recorded yet (new starter, probation milestone). */
export type UpcomingReviewRow = {
  employeeId: string
  reviewTypeId: string
  reviewType: { id: string; name: string; code: string | null }
  nextDue: string
  status: string | null
  employee?: EmployeeReviewOverviewRow['employee']
}

/** `meta.upcoming`: reviews due from the schedule with nothing recorded yet. */
type ReviewsEnvelope<T> = Omit<ApiEnvelope<T[]>, 'meta'> & { meta?: { upcoming?: UpcomingReviewRow[] } }

export async function fetchEmployeeReviews(
  employeeId: string,
): Promise<{ rows: EmployeeReviewRow[]; upcoming: UpcomingReviewRow[] }> {
  const res = await apiJson<ReviewsEnvelope<EmployeeReviewRow>>(`/employees/${employeeId}/reviews`, {
    method: 'GET',
  })
  return { rows: res.data, upcoming: res.meta?.upcoming ?? [] }
}

export async function fetchEmployeeReviewsOverview(): Promise<{
  rows: EmployeeReviewOverviewRow[]
  upcoming: UpcomingReviewRow[]
}> {
  const res = await apiJson<ReviewsEnvelope<EmployeeReviewOverviewRow>>('/employee-reviews/overview', {
    method: 'GET',
  })
  return { rows: res.data, upcoming: res.meta?.upcoming ?? [] }
}

export async function createEmployeeReview(
  employeeId: string,
  body: {
    reviewTypeId: string
    status?: string
    lastDone?: string
    nextDue?: string
    notes?: string
    documentUrl?: string
    reviewedById?: string
  },
): Promise<EmployeeReviewRow> {
  const res = await apiJson<ApiEnvelope<EmployeeReviewRow>>(`/employees/${employeeId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateEmployeeReview(
  employeeId: string,
  reviewId: string,
  body: {
    reviewTypeId?: string
    status?: string
    lastDone?: string | null
    nextDue?: string | null
    notes?: string | null
    documentUrl?: string
    reviewedById?: string | null
    /** Required when the type or dates change; kept in the review's history. */
    reason?: string
  },
): Promise<EmployeeReviewRow> {
  const res = await apiJson<ApiEnvelope<EmployeeReviewRow>>(
    `/employees/${employeeId}/reviews/${reviewId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  )
  return res.data
}

/** Next due a review would get from its type's schedule (same rule as reminders and the dashboard). */
export async function previewEmployeeReviewNextDue(
  employeeId: string,
  reviewTypeId: string,
  lastDoneIso: string | null,
): Promise<string | null> {
  const qs = new URLSearchParams({ reviewTypeId })
  if (lastDoneIso) qs.set('lastDone', lastDoneIso)
  const res = await apiJson<ApiEnvelope<{ nextDue: string | null }>>(
    `/employees/${employeeId}/reviews/next-due?${qs.toString()}`,
    { method: 'GET' },
  )
  return res.data.nextDue
}

export async function deleteEmployeeReview(employeeId: string, reviewId: string, reason: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(
    `/employees/${employeeId}/reviews/${reviewId}?${new URLSearchParams({ reason }).toString()}`,
    { method: 'DELETE' },
  )
}

type HistoryPerson = { id: string; firstName: string | null; lastName: string | null; email: string } | null

export type EmployeeReviewHistory = {
  events: Array<{
    id: string
    action: string
    at: string
    by: HistoryPerson
    reason: string | null
    changes: Array<{ field: string; from: unknown; to: unknown }>
  }>
  sessions: Array<{ id: string; heldAt: string | null; completedAt: string | null; supervisor: HistoryPerson }>
}

/** Who recorded and changed a review, when and why, plus the supervision sessions held for it. */
export async function fetchEmployeeReviewHistory(employeeId: string, reviewId: string): Promise<EmployeeReviewHistory> {
  return (
    await apiJson<ApiEnvelope<EmployeeReviewHistory>>(`/employees/${employeeId}/reviews/${reviewId}/history`, {
      method: 'GET',
    })
  ).data
}

