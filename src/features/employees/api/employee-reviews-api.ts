import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type EmployeeReviewRow = {
  id: string
  employeeId: string
  reviewTypeId: string | null
  status: string | null
  lastDone: string | null
  nextDue: string | null
  notes: string | null
  reviewedById: string | null
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

export async function fetchEmployeeReviews(employeeId: string): Promise<EmployeeReviewRow[]> {
  const res = await apiJson<ApiEnvelope<EmployeeReviewRow[]>>(`/employees/${employeeId}/reviews`, {
    method: 'GET',
  })
  return res.data
}

export async function fetchEmployeeReviewsOverview(): Promise<EmployeeReviewOverviewRow[]> {
  const res = await apiJson<ApiEnvelope<EmployeeReviewOverviewRow[]>>('/employee-reviews/overview', {
    method: 'GET',
  })
  return res.data
}

export async function createEmployeeReview(
  employeeId: string,
  body: {
    reviewTypeId: string
    status?: string
    lastDone?: string
    nextDue?: string
    notes?: string
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

export async function deleteEmployeeReview(employeeId: string, reviewId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/employees/${employeeId}/reviews/${reviewId}`, {
    method: 'DELETE',
  })
}

export function computeNextDueFromLastDone(
  lastDoneIso: string,
  intervalDays: number | null | undefined,
): string | undefined {
  if (!intervalDays || intervalDays <= 0) return undefined
  const d = new Date(lastDoneIso)
  if (Number.isNaN(d.getTime())) return undefined
  d.setDate(d.getDate() + intervalDays)
  return d.toISOString()
}
