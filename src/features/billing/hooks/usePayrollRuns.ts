import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approvePayrollRun,
  calculatePayrollRun,
  createEmployeeSalaryDeduction,
  createPayrollRun,
  deleteEmployeeSalaryDeduction,
  downloadPayrollRunCsv,
  exportPayrollRun,
  fetchEmployeeEarnings,
  fetchEmployeeSalaries,
  fetchPayrollRun,
  fetchPayrollRuns,
  fetchPayrollRunsSummary,
  lockPayrollRun,
  resetEmployeeEarnings,
} from '@/features/billing/api/payroll-runs.api'
import { billingKeys } from '@/features/billing/keys'
import { payrollKeys } from '@/features/payroll/keys'

export function usePayrollRuns(filters?: { locationId?: string }) {
  return useQuery({
    queryKey: billingKeys.payrollRuns(filters),
    queryFn: () => fetchPayrollRuns(filters),
  })
}

export function usePayrollRun(id: string | undefined) {
  return useQuery({
    queryKey: billingKeys.payrollRun(id ?? ''),
    queryFn: () => fetchPayrollRun(id!),
    enabled: Boolean(id),
  })
}

export function usePayrollRunsSummary(locationId?: string | null) {
  return useQuery({
    queryKey: billingKeys.payrollRunsSummary(locationId),
    queryFn: () => fetchPayrollRunsSummary(locationId ?? undefined),
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

export function useEmployeeSalaries(
  filters?: { dateFrom?: string; dateTo?: string; locationId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: billingKeys.employeeSalaries(filters),
    queryFn: () => fetchEmployeeSalaries(filters),
    enabled,
  })
}

export function useCreateEmployeeSalaryDeduction(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      body: Parameters<typeof createEmployeeSalaryDeduction>[1],
    ) => createEmployeeSalaryDeduction(employeeId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...billingKeys.all, 'employee-earnings', employeeId],
      })
    },
  })
}

export function useDeleteEmployeeSalaryDeduction(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deductionId: string) =>
      deleteEmployeeSalaryDeduction(employeeId, deductionId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...billingKeys.all, 'employee-earnings', employeeId],
      })
    },
  })
}

export function useResetEmployeeEarnings(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => resetEmployeeEarnings(employeeId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...billingKeys.all, 'employee-earnings', employeeId],
      })
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-salaries'] })
      void qc.invalidateQueries({ queryKey: [...billingKeys.all, 'employee-payouts'] })
      void qc.invalidateQueries({ queryKey: payrollKeys.all })
    },
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
