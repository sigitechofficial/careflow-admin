import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveHours,
  fetchHoursApprovals,
  rejectHours,
  type HoursApprovalStatus,
} from '@/features/hours-approvals/api'

const keys = {
  all: () => ['hours-approvals'] as const,
  list: (status?: HoursApprovalStatus) => [...keys.all(), status ?? 'all'] as const,
}

export function useHoursApprovals(status?: HoursApprovalStatus) {
  return useQuery({
    queryKey: keys.list(status),
    queryFn: ({ signal }) => fetchHoursApprovals(status, { signal }),
  })
}

export function useApproveHours() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; notes?: string }) => approveHours(args.id, args.notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all() }),
  })
}

export function useRejectHours() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; notes?: string }) => rejectHours(args.id, args.notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all() }),
  })
}
