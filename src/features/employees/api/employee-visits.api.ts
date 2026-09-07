import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

export type EmployeeVisitBucket = 'completed' | 'ongoing' | 'upcoming' | 'other'

export type EmployeeVisitsSummary = {
  total: number
  completed: number
  ongoing: number
  upcoming: number
  other: number
  totalPlannedMinutes: number
}

export type EmployeeVisitRow = {
  jobId: string
  visitId: string
  /** Same EMONITORED visit reference as visit reconciliation (VIS-[BRANCH]-YYYYMMDD-NNNN). */
  visitRef?: string | null
  allocationId: string
  bucket: EmployeeVisitBucket
  status: string
  slotLabel: string
  serviceUser: {
    id: string
    name: string
    preferredName?: string | null
    firstName?: string | null
    lastName?: string | null
  }
  scheduledStartDateTime: string
  scheduledEndDateTime: string | null
  actualStartDateTime: string | null
  actualEndDateTime: string | null
  plannedMinutes: number
  actualMinutes: number | null
  /** True when JobAllocation has its own start/end (not inherited from visit). */
  hasExplicitTiming?: boolean
  deliveryAssessment?: TimelineJob['deliveryAssessment']
  job: TimelineJob
}

export type EmployeeVisitsResponse = {
  employeeId: string
  month: string
  summary: EmployeeVisitsSummary
  visits: EmployeeVisitRow[]
}

export async function getEmployeeVisits(
  employeeId: string,
  month: string,
  init?: RequestInit,
): Promise<EmployeeVisitsResponse> {
  const q = new URLSearchParams({ month })
  const res = await apiJson<ApiEnvelope<EmployeeVisitsResponse>>(
    `/employees/${encodeURIComponent(employeeId)}/visits?${q.toString()}`,
    { method: 'GET', ...init },
  )
  return (
    res.data ?? {
      employeeId,
      month,
      summary: {
        total: 0,
        completed: 0,
        ongoing: 0,
        upcoming: 0,
        other: 0,
        totalPlannedMinutes: 0,
      },
      visits: [],
    }
  )
}
