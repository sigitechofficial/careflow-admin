import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approvePayrollRun,
  calculatePayrollRun,
  createPayrollRun,
  downloadPayrollRunCsv,
  exportPayrollRun,
  fetchEmployeeEarnings,
  fetchPayrollRun,
  fetchPayrollRuns,
  fetchPayrollRunsSummary,
  lockPayrollRun,
} from '@/features/billing/api/payroll-runs.api'
import { billingKeys } from '@/features/billing/keys'

export function usePayrollRuns() {
  return useQuery({
    queryKey: billingKeys.payrollRuns(),
    queryFn: fetchPayrollRuns,
  })
}

export function usePayrollRun(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.payrollRun(id ?? ''),
    queryFn: () => fetchPayrollRun(id!),
    enabled: Boolean(id),
  })
}

export function usePayrollRunsSummary() {
  return useQuery({
    queryKey: billingKeys.payrollRunsSummary(),
    queryFn: fetchPayrollRunsSummary,
  })
}

export function useEmployeeEarnings(
  employeeId: string | undefined,
  filters?: { dateFrom?: string; dateTo?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: billingKeys.employeeEarnings(employeeId ?? '', filters),
    queryFn: () => fetchEmployeeEarnings(employeeId!, filters),
    enabled: enabled && Boolean(employeeId),
  })
}

export function useCreatePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPayrollRun,
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}

export function useCalculatePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: calculatePayrollRun,
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}

export function useApprovePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: approvePayrollRun,
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}

export function useLockPayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: lockPayrollRun,
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}

export function useExportPayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: exportPayrollRun,
    onSuccess: () => void qc.invalidateQueries({ queryKey: billingKeys.all }),
  })
}

export function useDownloadPayrollRunCsv() {
  return useMutation({
    mutationFn: downloadPayrollRunCsv,
  })
}
