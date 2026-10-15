import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type SpecialVisitRow = {
  id: string
  employeeId: string
  /** 'YYYY-MM-DD' */
  visitDate: string
  durationMinutes: number
  hours: number
  title: string
  notes: string | null
  createdAt: string
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
  /** 'YYYY-MM-DD' */
  visitDate: string
  durationMinutes: number
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

export async function createSpecialVisit(body: CreateSpecialVisitBody): Promise<SpecialVisitRow> {
  const res = await apiJson<ApiEnvelope<SpecialVisitRow>>('/special-visits', {
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
