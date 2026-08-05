import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activatePayrollTaxYear,
  cancelUkPayrollRun,
  closeUkPayrollRun,
  createEmployeePayAgreement,
  createPayrollSchedule,
  createPayrollTaxYear,
  createUkPayrollRun,
  deleteAllUkPayrollRuns,
  deletePayrollPeriod,
  deletePayrollPeriods,
  enrolUkPayrollRun,
  calculateUkPayrollGross,
  calculateUkPayrollStatutory,
  ensureUkPayrollTaxYears,
  fetchEmployeePayrollProfile,
  fetchPayrollEmployees,
  fetchPayrollOverview,
  fetchPayrollPeriods,
  fetchPayrollSchedules,
  fetchPayrollTaxYears,
  fetchUkPayrollRun,
  fetchUkPayrollRuns,
  generatePayrollPeriods,
  purgeAllPayrollData,
  reactivateUkPayrollRun,
  updatePayrollSchedule,
  upsertEmployeePayrollProfile,
} from '@/features/payroll/api/payroll.api'
import { payrollKeys } from '@/features/payroll/keys'
import type {
  CreateEmployeePayAgreementInput,
  CreatePayrollScheduleInput,
  CreatePayrollTaxYearInput,
  CreateUkPayrollRunInput,
  UpdatePayrollScheduleInput,
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
    onError: (error) => toastApiError(error),
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
    onError: (error) => toastApiError(error),
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
    onError: (error) => toastApiError(error),
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
    onError: (error) => toastApiError(error),
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
    onError: (error) => toastApiError(error),
  })
}

export function useUpdatePayrollSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; body: UpdatePayrollScheduleInput }) =>
      updatePayrollSchedule(args.id, args.body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.schedules() })
      toastSuccess('Pay schedule updated')
    },
    onError: (error) => toastApiError(error),
  })
}

export function useGeneratePayrollPeriods() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      scheduleId: string
      taxYearId: string
      replaceExisting?: boolean
    }) =>
      generatePayrollPeriods(args.scheduleId, args.taxYearId, {
        replaceExisting: args.replaceExisting,
      }),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      toastSuccess(vars.replaceExisting ? 'Pay periods regenerated' : 'Pay periods generated')
    },
    onError: (error) => toastApiError(error),
  })
}

export function useDeletePayrollPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (periodId: string) => deletePayrollPeriod(periodId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      toastSuccess('Pay period deleted')
    },
    onError: (error) => toastApiError(error),
  })
}

export function useDeletePayrollPeriods() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { scheduleId: string; taxYearId: string }) =>
      deletePayrollPeriods(args.scheduleId, args.taxYearId),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      const n = data?.deleted ?? 0
      toastSuccess(`Deleted ${n} pay period${n === 1 ? '' : 's'}`)
    },
    onError: (error) => toastApiError(error),
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

export function useEmployeePayrollProfile(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: payrollKeys.profile(employeeId),
    queryFn: () => fetchEmployeePayrollProfile(employeeId),
    enabled: Boolean(employeeId) && enabled,
  })
}

export function useUpsertEmployeePayrollProfile(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertEmployeePayrollProfileInput) =>
      upsertEmployeePayrollProfile(employeeId, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.employees() })
      await qc.invalidateQueries({ queryKey: payrollKeys.profile(employeeId) })
      toastSuccess('Payroll profile saved')
    },
    onError: (error) => toastApiError(error),
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
    onError: (error) => toastApiError(error),
  })
}

export function useUkPayrollRuns() {
  return useQuery({
    queryKey: payrollKeys.runs(),
    queryFn: fetchUkPayrollRuns,
  })
}

export function useDeleteAllUkPayrollRuns() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteAllUkPayrollRuns,
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      await qc.invalidateQueries({ queryKey: ['billing'] })
      toastSuccess(
        'UK payroll runs deleted',
        `${data.runs} run${data.runs === 1 ? '' : 's'}` +
          (data.periodsReopened > 0
            ? ` · ${data.periodsReopened} period${data.periodsReopened === 1 ? '' : 's'} reopened`
            : '') +
          (data.payoutBatches > 0
            ? ` · ${data.payoutBatches} payout batch${data.payoutBatches === 1 ? '' : 'es'}`
            : ''),
      )
    },
    onError: (error) => toastApiError(error),
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
    onError: (error) => toastApiError(error),
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
    onError: (error) => toastApiError(error),
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
    onError: (error) => toastApiError(error),
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
    onError: (error) => toastApiError(error),
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
    onError: (error) => toastApiError(error),
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
    onError: (error) => toastApiError(error),
  })
}

export function useReactivateUkPayrollRun(id?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => reactivateUkPayrollRun(runId),
    onSuccess: async (_data, runId) => {
      const idToInvalidate = id || runId
      await qc.invalidateQueries({ queryKey: payrollKeys.run(idToInvalidate) })
      await qc.invalidateQueries({ queryKey: payrollKeys.runs() })
      await qc.invalidateQueries({ queryKey: payrollKeys.periods() })
      toastSuccess('Run reactivated')
    },
    onError: (error) => toastApiError(error),
  })
}
