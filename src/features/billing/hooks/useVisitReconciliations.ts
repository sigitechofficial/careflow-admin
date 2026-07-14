import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveVisitOverrun,
  approveVisitReconciliation,
  backfillVisitReconciliations,
  bulkApproveVisitReconciliations,
  clearAllVisitReconciliations,
  fetchVisitReconciliation,
  fetchVisitReconciliationExceptionQueue,
  fetchVisitReconciliations,
  fetchVisitReconciliationsSummary,
  rejectVisitOverrun,
  rejectVisitReconciliation,
  updateVisitReconciliation,
} from '@/features/billing/api/visit-reconciliations.api'
import { billingKeys } from '@/features/billing/keys'
import type { ApproveScope } from '@/features/billing/types/visit-reconciliation.types'
import type { VisitReconciliationStatus } from '@/features/billing/types/billing.types'

export function useVisitReconciliations(filters?: {
  search?: string
  status?: VisitReconciliationStatus
  hasExceptions?: boolean
  serviceUserId?: string
  employeeId?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: billingKeys.visitReconciliations(filters),
    queryFn: () => fetchVisitReconciliations(filters),
  })
}

export function useVisitReconciliation(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.visitReconciliation(id ?? ''),
    queryFn: () => fetchVisitReconciliation(id!),
    enabled: Boolean(id),
  })
}

export function useVisitReconciliationsSummary() {
  return useQuery({
    queryKey: billingKeys.visitReconciliationsSummary(),
    queryFn: fetchVisitReconciliationsSummary,
  })
}

export function useVisitReconciliationExceptionQueue(limit = 10) {
  return useQuery({
    queryKey: billingKeys.visitReconciliationExceptionQueue(limit),
    queryFn: () => fetchVisitReconciliationExceptionQueue(limit),
  })
}

export function useUpdateVisitReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: {
        travelMiles?: number | null
        travelMinutes?: number | null
        approvalNotes?: string | null
      }
    }) => updateVisitReconciliation(id, body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      void qc.invalidateQueries({ queryKey: billingKeys.visitReconciliation(vars.id) })
    },
  })
}

export function useApproveVisitReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      scope,
      managerOverride,
    }: {
      id: string
      scope: ApproveScope
      managerOverride?: boolean
    }) => approveVisitReconciliation(id, { scope, managerOverride }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function useRejectVisitReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, scope }: { id: string; scope: ApproveScope }) =>
      rejectVisitReconciliation(id, { scope }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function useApproveVisitOverrun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      approveVisitOverrun(id, { notes }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      void qc.invalidateQueries({ queryKey: billingKeys.visitReconciliation(vars.id) })
    },
  })
}

export function useRejectVisitOverrun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      rejectVisitOverrun(id, { notes }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      void qc.invalidateQueries({ queryKey: billingKeys.visitReconciliation(vars.id) })
    },
  })
}

export function useBulkApproveVisitReconciliations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { ids: string[]; scope: ApproveScope }) =>
      bulkApproveVisitReconciliations(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function useBackfillVisitReconciliations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body?: { dateFrom?: string; dateTo?: string }) => backfillVisitReconciliations(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function useClearAllVisitReconciliations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => clearAllVisitReconciliations(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}
