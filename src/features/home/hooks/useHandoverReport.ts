import { useQuery } from '@tanstack/react-query'
import {
  fetchHandoverReport,
  type FetchHandoverReportParams,
  type HandoverReportSortBy,
} from '@/features/home/api/handover-report.api'

export const handoverReportKeys = {
  all: ['dashboard', 'handover-report'] as const,
  list: (params: Omit<FetchHandoverReportParams, 'signal'>) =>
    [...handoverReportKeys.all, params] as const,
}

export function useHandoverReport(params: {
  from?: string
  to?: string
  serviceUserName?: string
  sortBy: HandoverReportSortBy
  enabled?: boolean
}) {
  const { enabled = true, ...queryParams } = params
  return useQuery({
    queryKey: handoverReportKeys.list(queryParams),
    queryFn: ({ signal }) => fetchHandoverReport({ ...queryParams, signal }),
    enabled,
    staleTime: 30_000,
  })
}
