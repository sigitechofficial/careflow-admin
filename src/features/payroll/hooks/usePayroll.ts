import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activatePayrollTaxYear,
  cancelUkPayrollRun,
  closeUkPayrollRun,
  createEmployeePayAgreement,
  createPayrollSchedule,
  createPayrollTaxYear,
  createUkPayrollRun,
  enrolUkPayrollRun,
  calculateUkPayrollGross,
  calculateUkPayrollStatutory,
  ensureUkPayrollTaxYears,
  fetchPayrollEmployees,
  fetchPayrollOverview,
  fetchPayrollPeriods,
  fetchPayrollSchedules,
  fetchPayrollTaxYears,
  fetchUkPayrollRun,
  fetchUkPayrollRuns,
  generatePayrollPeriods,
  purgeAllPayrollData,
  upsertEmployeePayrollProfile,
} from '@/features/payroll/api/payroll.api'
import { payrollKeys } from '@/features/payroll/keys'
import type {
  CreateEmployeePayAgreementInput,
  CreatePayrollScheduleInput,
  CreatePayrollTaxYearInput,
  CreateUkPayrollRunInput,
  UpsertEmployeePayrollProfileInput,
} from '@/features/payroll/types/payroll-api.types'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

export function usePayrollOverview() {
  return useQuery({
    queryKey: payrollKeys.overview(),
    queryFn: fetchPayrollOverview,
  })
}

export function usePurgeAllPayrollData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: purgeAllPayrollData,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      toastSuccess('All UK payroll data deleted')
    },
    onError: toastApiError,
  })
}

export function usePayrollTaxYears() {
  return useQuery({
    queryKey: payrollKeys.taxYears(),
    queryFn: fetchPayrollTaxYears,
  })
}

export function useCreatePayrollTaxYear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePayrollTaxYearInput) => createPayrollTaxYear(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      toastSuccess('Tax year created')
    },
    onError: toastApiError,
  })
}

export function useActivatePayrollTaxYear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => activatePayrollTaxYear(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      toastSuccess('Tax year activated')
    },
    onError: toastApiError,
  })
}

export function useEnsureUkPayrollTaxYears() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ensureUkPayrollTaxYears,
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      const created = data?.created?.length ?? 0
      toastSuccess(
        created > 0
          ? `Added ${created} UK tax year${created === 1 ? '' : 's'}`
          : 'UK tax years already up to date',
      )
    },
    onError: toastApiError,
  })
}

export function usePayrollSchedules() {
  return useQuery({
    queryKey: payrollKeys.schedules(),
    queryFn: fetchPayrollSchedules,
  })
}

export function useCreatePayrollSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePayrollScheduleInput) => createPayrollSchedule(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.schedules() })
      toastSuccess('Pay schedule created')
    },
    onError: toastApiError,
  })
}

export function useGeneratePayrollPeriods() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { scheduleId: string; taxYearId: string }) =>
      generatePayrollPeriods(args.scheduleId, args.taxYearId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      toastSuccess('Pay periods generated')
    },
    onError: toastApiError,
  })
}

export function usePayrollPeriods(params?: { scheduleId?: string; taxYearId?: string }) {
  return useQuery({
    queryKey: payrollKeys.periods(params),
    queryFn: () => fetchPayrollPeriods(params),
  })
}

export function usePayrollEmployees() {
  return useQuery({
    queryKey: payrollKeys.employees(),
    queryFn: fetchPayrollEmployees,
  })
}

export function useUpsertEmployeePayrollProfile(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertEmployeePayrollProfileInput) =>
      upsertEmployeePayrollProfile(employeeId, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.employees() })
      toastSuccess('Payroll profile saved')
    },
    onError: toastApiError,
  })
}

export function useCreateEmployeePayAgreement(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateEmployeePayAgreementInput) =>
      createEmployeePayAgreement(employeeId, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.employees() })
      toastSuccess('Pay agreement created')
    },
    onError: toastApiError,
  })
}

export function useUkPayrollRuns() {
  return useQuery({
    queryKey: payrollKeys.runs(),
    queryFn: fetchUkPayrollRuns,
  })
}

export function useUkPayrollRun(id: string) {
  return useQuery({
    queryKey: payrollKeys.run(id),
    queryFn: () => fetchUkPayrollRun(id),
    enabled: Boolean(id),
  })
}

export function useCreateUkPayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateUkPayrollRunInput) => createUkPayrollRun(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.runs() })
      toastSuccess('UK payroll run created')
    },
    onError: toastApiError,
  })
}

export function useEnrolUkPayrollRun(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => enrolUkPayrollRun(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.run(id) })
      await qc.invalidateQueries({ queryKey: payrollKeys.runs() })
      toastSuccess('Employees enrolled')
    },
    onError: toastApiError,
  })
}

export function useCalculateUkPayrollGross(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => calculateUkPayrollGross(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.run(id) })
      await qc.invalidateQueries({ queryKey: payrollKeys.runs() })
      toastSuccess('Gross pay calculated')
    },
    onError: toastApiError,
  })
}

export function useCalculateUkPayrollStatutory(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => calculateUkPayrollStatutory(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.run(id) })
      await qc.invalidateQueries({ queryKey: payrollKeys.runs() })
      toastSuccess('Tax & NI calculated (Week 1 / Month 1)')
    },
    onError: toastApiError,
  })
}

export function useCloseUkPayrollRun(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => closeUkPayrollRun(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.run(id) })
      await qc.invalidateQueries({ queryKey: payrollKeys.runs() })
      toastSuccess('Run closed (shell)')
    },
    onError: toastApiError,
  })
}

export function useCancelUkPayrollRun(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => cancelUkPayrollRun(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.run(id) })
      await qc.invalidateQueries({ queryKey: payrollKeys.runs() })
      toastSuccess('Run cancelled')
    },
    onError: toastApiError,
  })
}
