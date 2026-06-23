import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bulkGenerateVisitPlanSchedule,
  fetchBulkVisitPlanScheduleCandidates,
} from '@/features/scheduling/api/bulk-visit-plan-schedule.api'
import { schedulingKeys } from '@/features/scheduling/keys'

export function useBulkVisitPlanScheduleCandidates(params?: {
  locationId?: string
  readyOnly?: boolean
  enabled?: boolean
}) {
  const { enabled = true, ...queryParams } = params ?? {}
  return useQuery({
    queryKey: schedulingKeys.bulkCandidates(queryParams),
    queryFn: () => fetchBulkVisitPlanScheduleCandidates(queryParams),
    enabled,
    staleTime: 30_000,
  })
}

export function useBulkGenerateVisitPlanSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bulkGenerateVisitPlanSchedule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: schedulingKeys.all() })
    },
  })
}
