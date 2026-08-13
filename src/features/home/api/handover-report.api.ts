import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type HandoverReportSortBy = 'name' | 'earliest' | 'latest'

export type HandoverReportEntry = {
  id: string
  serviceUserId: string
  serviceUserName: string
  occurredAt: string
  timeLabel: string
  task: string
  carerName: string
  carerId: string | null
  notes: string
  source: 'handover' | 'visit_note' | 'visit'
}

export type HandoverReportData = {
  windowHours: number
  from: string
  to: string
  fromIso: string
  toIso: string
  organisationTimezone: string
  entries: HandoverReportEntry[]
}

export type FetchHandoverReportParams = {
  from?: string
  to?: string
  serviceUserName?: string
  sortBy?: HandoverReportSortBy
  signal?: AbortSignal
}

export async function fetchHandoverReport(
  params: FetchHandoverReportParams = {},
): Promise<HandoverReportData> {
  const qs = new URLSearchParams()
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  if (params.serviceUserName?.trim()) qs.set('serviceUserName', params.serviceUserName.trim())
  if (params.sortBy) qs.set('sortBy', params.sortBy)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<HandoverReportData>>(`/dashboard/handover-report${suffix}`, {
    signal: params.signal,
  })
  return res.data
}
