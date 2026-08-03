import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveEmployeePayoutBatch,
  cancelEmployeePayoutBatch,
  createEmployeePayoutBatch,
  deleteAllEmployeePayoutBatches,
  fetchEmployeePayoutBatch,
  fetchEmployeePayoutBatches,
  fetchPayoutEligibleUkRuns,
  markEmployeePayoutBatchPaid,
} from '@/features/billing/api/employee-payouts.api'
import { billingKeys } from '@/features/billing/keys'

export function useEmployeePayoutBatches(
  periodKey?: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: billingKeys.employeePayoutBatches(periodKey ?? undefined),
    queryFn: () =>
      fetchEmployeePayoutBatches(
        periodKey ? { periodKey } : undefined,
      ),
    enabled,
  })
}

export function usePayoutEligibleUkRuns(enabled = true) {
  return useQuery({
    queryKey: [...billingKeys.all, 'employee-payouts-eligible-uk-runs'] as const,
    queryFn: fetchPayoutEligibleUkRuns,
    enabled,
  })
}

export function useEmployeePayoutBatch(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.employeePayoutBatch(id ?? ''),
    queryFn: () => fetchEmployeePayoutBatch(id!),
    enabled: Boolean(id),
  })
}

export function useCreateEmployeePayoutBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createEmployeePayoutBatch,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-payouts'] })
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-salaries'] })
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-earnings'] })
    },
  })
}

export function useApproveEmployeePayoutBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: approveEmployeePayoutBatch,
    onSuccess: data => {
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-payouts'] })
      void qc.invalidateQueries({
        queryKey: billingKeys.employeePayoutBatch(data.id),
      })
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-salaries'] })
    },
  })
}

export function useMarkEmployeePayoutBatchPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markEmployeePayoutBatchPaid,
    onSuccess: data => {
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-payouts'] })
      void qc.invalidateQueries({
        queryKey: billingKeys.employeePayoutBatch(data.id),
      })
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-salaries'] })
    },
  })
}

export function useCancelEmployeePayoutBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cancelEmployeePayoutBatch,
    onSuccess: data => {
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-payouts'] })
      void qc.invalidateQueries({
        queryKey: billingKeys.employeePayoutBatch(data.id),
      })
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-salaries'] })
    },
  })
}

export function useDeleteAllEmployeePayoutBatches() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteAllEmployeePayoutBatches,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-payouts'] })
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-payout'] })
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-salaries'] })
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-earnings'] })
    },
  })
}
