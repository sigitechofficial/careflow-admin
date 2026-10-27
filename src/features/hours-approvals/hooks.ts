import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveHours,
  cancelHoursApproval,
  fetchContractedHoursPreview,
  fetchHoursApprovals,
  fetchPendingContractedHoursChange,
  fetchPendingServiceUserHoursChange,
  fetchServiceUserHoursImpact,
  rejectHours,
  requestContractedHoursChange,
  requestServiceUserHoursChange,
  type HoursApprovalStatus,
} from '@/features/hours-approvals/api'

const keys = {
  all: () => ['hours-approvals'] as const,
  list: (status?: HoursApprovalStatus) => [...keys.all(), status ?? 'all'] as const,
  pendingContracted: (employeeId: string) =>
    [...keys.all(), 'contracted-pending', employeeId] as const,
  pendingServiceUserHours: (serviceUserId: string) =>
    [...keys.all(), 'service-user-hours-pending', serviceUserId] as const,
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

/** The carer's contracted hours change waiting for approval (null when none). */
export function usePendingContractedHoursChange(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: keys.pendingContracted(employeeId),
    queryFn: ({ signal }) => fetchPendingContractedHoursChange(employeeId, { signal }),
    enabled: enabled && Boolean(employeeId),
  })
}

/** Preview what approving a contracted hours value would change (called on save). */
export function useContractedHoursPreview() {
  return useMutation({
    mutationFn: (args: { employeeId: string; contractedWeeklyHours: number }) =>
      fetchContractedHoursPreview(args.employeeId, args.contractedWeeklyHours),
  })
}

export function useRequestContractedHoursChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: requestContractedHoursChange,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all() }),
  })
}

export function useCancelHoursApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelHoursApproval(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all() }),
  })
}

/** The service user's weekly hours change waiting for approval (null when none). */
export function usePendingServiceUserHoursChange(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: keys.pendingServiceUserHours(serviceUserId),
    queryFn: ({ signal }) => fetchPendingServiceUserHoursChange(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
    select: d => d.pending,
  })
}

/** Settings → Dom Rules: which weekly hours changes need a manager (same request as the pending one). */
export function useServiceUserHoursChangeApproval(serviceUserId: string, enabled = true) {
  return useQuery({
    queryKey: keys.pendingServiceUserHours(serviceUserId),
    queryFn: ({ signal }) => fetchPendingServiceUserHoursChange(serviceUserId, { signal }),
    enabled: enabled && Boolean(serviceUserId),
    select: d => d.changeApproval,
  })
}

export function useRequestServiceUserHoursChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: requestServiceUserHoursChange,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all() }),
  })
}

/** Lower weekly hours: which weeks go over and which visits would be cancelled (nothing is saved). */
export function useServiceUserHoursImpact(serviceUserId: string, weeklyHours: number | null, enabled = true) {
  return useQuery({
    queryKey: [...keys.all(), 'service-user-hours-impact', serviceUserId, weeklyHours] as const,
    queryFn: ({ signal }) => fetchServiceUserHoursImpact(serviceUserId, weeklyHours ?? 0, { signal }),
    enabled: enabled && Boolean(serviceUserId) && weeklyHours != null,
  })
}
