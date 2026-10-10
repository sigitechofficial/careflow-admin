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
  recalculateVisitReconciliationAmounts,
  rejectVisitOverrun,
  rejectVisitReconciliation,
  setVisitPayableAmount,
  setVisitBillableAmount,
  updateVisitReconciliation,
} from '@/features/billing/api/visit-reconciliations.api'
import { billingKeys } from '@/features/billing/keys'
import type { ApproveScope, VisitNightDutyFilter } from '@/features/billing/types/visit-reconciliation.types'
import type { VisitReconciliationStatus } from '@/features/billing/types/billing.types'

export function useVisitReconciliations(filters?: {
  search?: string
  status?: VisitReconciliationStatus
  hasExceptions?: boolean
  serviceUserId?: string
  employeeId?: string
  locationId?: string
  nightDuty?: VisitNightDutyFilter
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

export function useVisitReconciliationsSummary(locationId?: string | null) {
  return useQuery({
    queryKey: billingKeys.visitReconciliationsSummary(locationId),
    queryFn: () => fetchVisitReconciliationsSummary(locationId ?? undefined),
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

export function useSetVisitPayableAmount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: {
        payableAmount: number
        notes?: string
        approveForPay?: boolean
      }
    }) => setVisitPayableAmount(id, body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      void qc.invalidateQueries({ queryKey: billingKeys.visitReconciliation(vars.id) })
    },
  })
}

export function useSetVisitBillableAmount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: {
        billableAmount: number
        notes?: string
        approveForInvoice?: boolean
      }
    }) => setVisitBillableAmount(id, body),
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
      exclusive,
      approvalNotes,
    }: {
      id: string
      scope: ApproveScope
      managerOverride?: boolean
      exclusive?: boolean
      approvalNotes?: string
    }) =>
      approveVisitReconciliation(id, {
        scope,
        managerOverride,
        exclusive,
        approvalNotes,
      }),
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
    mutationFn: ({
      id,
      notes,
      timeBasis,
      applyTo,
    }: {
      id: string
      notes?: string
      timeBasis?: 'PLANNED' | 'ACTUAL'
      applyTo?: 'PAY' | 'CHARGE' | 'BOTH'
    }) => approveVisitOverrun(id, { notes, timeBasis, applyTo }),
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
    mutationFn: (body: { ids: string[]; scope: ApproveScope; approvalNotes?: string }) =>
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

export function useRecalculateVisitReconciliationAmounts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { ids?: string[]; dateFrom?: string; dateTo?: string; reason: string }) =>
      recalculateVisitReconciliationAmounts(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function useClearAllVisitReconciliations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { serviceUserId?: string } = {}) => clearAllVisitReconciliations(params),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}
