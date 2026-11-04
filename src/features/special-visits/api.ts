import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type SpecialVisitRow = {
  id: string
  serviceUserId: string
  serviceUserName: string
  title: string
  notes: string | null
  /** ISO string */
  startDateTime: string
  /** ISO string */
  endDateTime: string | null
  durationMinutes: number
  hours: number
}

export type SpecialVisitSummary = {
  contractedHours: number
  bookedHours: number
  specialHours: number
  usedHours: number
  remainingHours: number
}

export type SpecialVisitsQuery = {
  employeeId: string
  /** 'YYYY-MM-DD' (week start) */
  weekStart: string
}

export type CreateSpecialVisitBody = {
  employeeId: string
  serviceUserId: string
  /** ISO string */
  startDateTime: string
  /** ISO string */
  endDateTime: string
  title: string
  notes?: string
}

/** Typed query key factory shared by the list and summary queries. */
export const specialVisitKeys = {
  all: () => ['special-visits'] as const,
  list: (employeeId: string, weekStart: string) =>
    [...specialVisitKeys.all(), 'list', employeeId, weekStart] as const,
  summary: (employeeId: string, weekStart: string) =>
    [...specialVisitKeys.all(), 'summary', employeeId, weekStart] as const,
}

export async function fetchSpecialVisits({
  employeeId,
  weekStart,
}: SpecialVisitsQuery): Promise<SpecialVisitRow[]> {
  const qs = new URLSearchParams({ employeeId, weekStart })
  const res = await apiJson<ApiEnvelope<SpecialVisitRow[]>>(`/special-visits?${qs.toString()}`, {
    method: 'GET',
  })
  return res.data
}

export async function fetchSpecialVisitSummary({
  employeeId,
  weekStart,
}: SpecialVisitsQuery): Promise<SpecialVisitSummary> {
  const qs = new URLSearchParams({ employeeId, weekStart })
  const res = await apiJson<ApiEnvelope<SpecialVisitSummary>>(
    `/special-visits/summary?${qs.toString()}`,
    { method: 'GET' },
  )
  return res.data
}

/**
 * `weeklyHoursWarning`: the visit takes the service user's week over the weekly contracted hours (Settings → Dom Rules: warning only).
 * `serviceUserHoursApprovalRequested`: over the service user's weekly hours and waiting for a manager — not made yet (`id` null).
 * `carerHoursApprovalRequested` / `carerHoursWarning`: the carer goes over their contracted weekly hours.
 */
export type CreateSpecialVisitResult = {
  id: string | null
  weeklyHoursWarning?: string
  serviceUserHoursApprovalRequested?: string
  /** Minutes over the service user's weekly hours paid from their timebank. */
  fromTimebankMinutes?: number
  carerHoursApprovalRequested?: string
  carerHoursWarning?: string
}

export async function createSpecialVisit(body: CreateSpecialVisitBody): Promise<CreateSpecialVisitResult> {
  const res = await apiJson<ApiEnvelope<CreateSpecialVisitResult>>('/special-visits', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteSpecialVisit(id: string): Promise<{ id: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string }>>(`/special-visits/${id}`, {
    method: 'DELETE',
  })
  return res.data
}
