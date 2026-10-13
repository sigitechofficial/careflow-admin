import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activatePayrollTaxYear,
  cancelUkPayrollRun,
  closeUkPayrollRun,
  approveEmployeePayAgreement,
  createEmployeePayAgreement,
  endEmployeePayAgreement,
  fetchEmployeePayAgreements,
  createPayrollSchedule,
  createPayrollTaxCode,
  createPayrollTaxYear,
  createUkPayrollRun,
  deleteAllUkPayrollRuns,
  deletePayrollPeriod,
  deletePayrollPeriods,
  deletePayrollTaxCode,
  enrolUkPayrollRun,
  calculateUkPayrollGross,
  calculateUkPayrollStatutory,
  ensureUkPayrollTaxYears,
  fetchEmployeePayrollProfile,
  fetchPayrollEmployees,
  fetchPayrollEmployerSettings,
  fetchPayrollEpsPreview,
  fetchPayrollEpsSubmissions,
  submitPayrollEps,
  approvePayrollEpsSubmission,
  rejectPayrollEpsSubmission,
  fetchPayrollOverview,
  fetchPayrollPeriods,
  fetchPayrollSchedules,
  fetchPayrollTaxCodes,
  fetchPayrollTaxYears,
  fetchPayrollStatutoryRates,
  fetchUkPayrollRun,
  fetchUkPayrollRunFps,
  fetchUkPayrollRunHmrcSubmissions,
  fetchUkPayrollRuns,
  fetchUkPayrollPayslips,
  generatePayrollPeriods,
  purgeAllPayrollData,
  reactivateUkPayrollRun,
  submitUkPayrollRunFps,
  approveUkPayrollRunHmrcSubmission,
  rejectUkPayrollRunHmrcSubmission,
  updatePayrollEmployerSettings,
  updatePayrollSchedule,
  updatePayrollStatutoryRates,
  updatePayrollTaxCode,
  upsertEmployeePayrollProfile,
} from '@/features/payroll/api/payroll.api'
import { payrollKeys } from '@/features/payroll/keys'
import type {
  CreateEmployeePayAgreementInput,
  CreatePayrollScheduleInput,
  CreatePayrollTaxCodeInput,
  CreatePayrollTaxYearInput,
  CreateUkPayrollRunInput,
  UpdatePayrollEmployerSettingsInput,
  UpdatePayrollScheduleInput,
  UpdatePayrollStatutoryRatesInput,
  UpdatePayrollTaxCodeInput,
  UpsertEmployeePayrollProfileInput,
} from '@/features/payroll/types/payroll-api.types'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { collectHmrcFraudClientContext } from '@/features/payroll/utils/hmrc-fraud-client-context.util'

export function usePayrollOverview() {
  return useQuery({
    queryKey: payrollKeys.overview(),
    queryFn: fetchPayrollOverview,
  })
}

export function usePayrollEmployerSettings() {
  return useQuery({
    queryKey: payrollKeys.employerSettings(),
    queryFn: fetchPayrollEmployerSettings,
  })
}

export function useUpdatePayrollEmployerSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdatePayrollEmployerSettingsInput) => updatePayrollEmployerSettings(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.employerSettings() })
      await qc.invalidateQueries({ queryKey: payrollKeys.overview() })
      toastSuccess('Employer PAYE settings saved')
    },
    onError: (error) => toastApiError(error),
  })
}

export function usePayrollEpsPreview(
  params: {
    taxYearId?: string
    taxMonth: number
    noPaymentThisPeriod?: boolean
    employmentAllowanceClaimed?: boolean
    smpRecovered?: number
    sppRecovered?: number
    sapRecovered?: number
    shppRecovered?: number
    spbpRecovered?: number
    nicCompensationOnStatutory?: number
  },
  enabled = true,
) {
  return useQuery({
    queryKey: payrollKeys.epsPreview(params),
    queryFn: () => fetchPayrollEpsPreview(params),
    enabled: enabled && params.taxMonth >= 1 && params.taxMonth <= 12,
  })
}

export function usePayrollEpsSubmissions(
  params: { taxYearId?: string; taxMonth?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: payrollKeys.epsSubmissions(params),
    queryFn: () => fetchPayrollEpsSubmissions(params),
    enabled,
  })
}

export function useSubmitPayrollEps() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      mode: 'DRY_RUN' | 'SUBMIT'
      environment?: 'TEST' | 'LIVE'
      taxYearId?: string
      taxMonth: number
      noPaymentThisPeriod?: boolean
      employmentAllowanceClaimed?: boolean
      smpRecovered?: number
    }) =>
      submitPayrollEps({
        ...body,
        clientContext: collectHmrcFraudClientContext(),
      }),
    onSuccess: async (data, vars) => {
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'eps-submissions'] })
      if (vars.mode === 'DRY_RUN') {
        toastSuccess(`EPS ${vars.environment ?? 'TEST'} dry run saved (not sent)`)
        return
      }
      if (data.status === 'PENDING_APPROVAL') {
        toastSuccess('Live EPS send requested — waiting for a second person to approve')
        return
      }
      if (data.status === 'ACKNOWLEDGED' || data.status === 'ACCEPTED' || data.status === 'SUBMITTED') {
        toastSuccess(`EPS sent to HMRC ${data.environment} · ${data.status}`)
        return
      }
      toastApiError(new Error(data.errorMessage || `EPS submit finished as ${data.status}`))
    },
    onError: (error) => toastApiError(error),
  })
}

export function useApprovePayrollEpsSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (submissionId: string) =>
      approvePayrollEpsSubmission(submissionId, collectHmrcFraudClientContext()),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'eps-submissions'] })
      if (data.status === 'ACKNOWLEDGED' || data.status === 'ACCEPTED' || data.status === 'SUBMITTED') {
        toastSuccess(`Live EPS approved and sent · ${data.status}`)
        return
      }
      toastApiError(new Error(data.errorMessage || `Live EPS finished as ${data.status}`))
    },
    onError: (error) => toastApiError(error),
  })
}

export function useRejectPayrollEpsSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { submissionId: string; reason?: string }) =>
      rejectPayrollEpsSubmission(input.submissionId, input.reason),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'eps-submissions'] })
      toastSuccess('Live EPS request rejected — nothing sent to HMRC')
    },
    onError: (error) => toastApiError(error),
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

export function usePayrollTaxCodes(params?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: payrollKeys.taxCodes(params),
    queryFn: () => fetchPayrollTaxCodes(params),
  })
}

export function useCreatePayrollTaxCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePayrollTaxCodeInput) => createPayrollTaxCode(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      toastSuccess('Tax code created')
    },
    onError: (error) => toastApiError(error),
  })
}

export function useUpdatePayrollTaxCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; body: UpdatePayrollTaxCodeInput }) =>
      updatePayrollTaxCode(args.id, args.body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      toastSuccess('Tax code updated')
    },
    onError: (error) => toastApiError(error),
  })
}

export function useDeletePayrollTaxCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePayrollTaxCode(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      toastSuccess('Tax code deleted')
    },
    onError: (error) => toastApiError(error),
  })
}

export function usePayrollStatutoryRates(params?: { taxYearId?: string }) {
  return useQuery({
    queryKey: payrollKeys.statutoryRates(params),
    queryFn: () => fetchPayrollStatutoryRates(params),
  })
}

export function useUpdatePayrollStatutoryRates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; body: UpdatePayrollStatutoryRatesInput }) =>
      updatePayrollStatutoryRates(args.id, args.body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.all })
      toastSuccess('Tax & NI rates saved')
    },
    onError: (error) => toastApiError(error),
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

export function usePayrollEmployees(locationId?: string | null) {
  return useQuery({
    queryKey: payrollKeys.employees(locationId),
    queryFn: () => fetchPayrollEmployees(locationId ?? undefined),
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
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'employees'] })
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
    onSuccess: async (agreement) => {
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'employees'] })
      await qc.invalidateQueries({ queryKey: payrollKeys.agreements(employeeId) })
      toastSuccess(
        agreement?.awaitingApproval
          ? 'Pay agreement saved. It takes effect when a second person approves it.'
          : 'Pay agreement created',
      )
    },
    onError: (error) => toastApiError(error),
  })
}

export function useEmployeePayAgreements(employeeId: string | null) {
  return useQuery({
    queryKey: payrollKeys.agreements(employeeId ?? ''),
    queryFn: () => fetchEmployeePayAgreements(employeeId as string),
    enabled: !!employeeId,
  })
}

export function useApproveEmployeePayAgreement(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (agreementId: string) => approveEmployeePayAgreement(agreementId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'employees'] })
      await qc.invalidateQueries({ queryKey: payrollKeys.agreements(employeeId) })
      toastSuccess('Pay agreement approved. It applies from its start date.')
    },
    onError: (error) => toastApiError(error),
  })
}

export function useEndEmployeePayAgreement(employeeId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { agreementId: string; effectiveTo: string }) =>
      endEmployeePayAgreement(input.agreementId, input.effectiveTo),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'employees'] })
      await qc.invalidateQueries({ queryKey: payrollKeys.agreements(employeeId) })
      toastSuccess('Pay agreement ended')
    },
    onError: (error) => toastApiError(error),
  })
}

export function useUkPayrollRuns(locationId?: string | null) {
  return useQuery({
    queryKey: payrollKeys.runs(locationId),
    queryFn: () => fetchUkPayrollRuns(locationId ?? undefined),
  })
}

export function useUkPayrollPayslips(locationId?: string | null) {
  return useQuery({
    queryKey: payrollKeys.payslips(locationId),
    queryFn: () => fetchUkPayrollPayslips(locationId ?? undefined),
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

export function useUkPayrollRun(id: string, locationId?: string | null) {
  return useQuery({
    queryKey: payrollKeys.run(id, locationId),
    queryFn: () => fetchUkPayrollRun(id, locationId ?? undefined),
    enabled: Boolean(id),
  })
}

export function useUkPayrollRunFps(id: string, enabled = true) {
  return useQuery({
    queryKey: payrollKeys.runFps(id),
    queryFn: () => fetchUkPayrollRunFps(id),
    enabled: Boolean(id) && enabled,
  })
}

export function useUkPayrollRunHmrcSubmissions(id: string, enabled = true) {
  return useQuery({
    queryKey: payrollKeys.runHmrcSubmissions(id),
    queryFn: () => fetchUkPayrollRunHmrcSubmissions(id),
    enabled: Boolean(id) && enabled,
  })
}

export function useSubmitUkPayrollRunFps(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { mode: 'DRY_RUN' | 'SUBMIT'; environment?: 'TEST' | 'LIVE' }) =>
      submitUkPayrollRunFps(
        id,
        input.mode,
        collectHmrcFraudClientContext(),
        input.environment ?? 'TEST',
      ),
    onSuccess: async (data, input) => {
      await qc.invalidateQueries({ queryKey: payrollKeys.runHmrcSubmissions(id) })
      await qc.invalidateQueries({ queryKey: payrollKeys.runFps(id) })
      if (input.mode === 'DRY_RUN') {
        toastSuccess(
          `FPS ${input.environment ?? 'TEST'} dry run saved — GovTalk XML + fraud headers (not sent)`,
        )
        return
      }
      if (data.status === 'PENDING_APPROVAL') {
        toastSuccess('Live FPS send requested — waiting for a second person to approve')
        return
      }
      if (data.status === 'ACKNOWLEDGED' || data.status === 'ACCEPTED' || data.status === 'SUBMITTED') {
        toastSuccess(`FPS sent to HMRC ${data.environment} · ${data.status}`)
        return
      }
      toastApiError(
        new Error(data.errorMessage || `HMRC submit finished as ${data.status}`),
      )
    },
    onError: (error) => toastApiError(error),
  })
}

export function useApproveUkPayrollRunHmrcSubmission(runId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (submissionId: string) =>
      approveUkPayrollRunHmrcSubmission(runId, submissionId, collectHmrcFraudClientContext()),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: payrollKeys.runHmrcSubmissions(runId) })
      if (data.status === 'ACKNOWLEDGED' || data.status === 'ACCEPTED' || data.status === 'SUBMITTED') {
        toastSuccess(`Live FPS approved and sent · ${data.status}`)
        return
      }
      toastApiError(new Error(data.errorMessage || `Live send finished as ${data.status}`))
    },
    onError: (error) => toastApiError(error),
  })
}

export function useRejectUkPayrollRunHmrcSubmission(runId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { submissionId: string; reason?: string }) =>
      rejectUkPayrollRunHmrcSubmission(runId, input.submissionId, input.reason),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: payrollKeys.runHmrcSubmissions(runId) })
      toastSuccess('Live FPS request rejected — nothing sent to HMRC')
    },
    onError: (error) => toastApiError(error),
  })
}

export function useCreateUkPayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateUkPayrollRunInput) => createUkPayrollRun(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'runs'] })
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
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'run', id] })
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'runs'] })
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
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'run', id] })
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'runs'] })
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
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'run', id] })
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'runs'] })
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
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'run', id] })
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'runs'] })
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'payslips'] })
      toastSuccess('Run closed (shell)')
    },
    onError: (error) => toastApiError(error),
  })
}

export function useCancelUkPayrollRun(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason?: string) => cancelUkPayrollRun(id, reason),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'run', id] })
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'runs'] })
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'payslips'] })
      toastSuccess('Run cancelled', 'Its earnings can now be collected by a replacement run.')
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
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'run', idToInvalidate] })
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'runs'] })
      await qc.invalidateQueries({ queryKey: [...payrollKeys.all, 'payslips'] })
      await qc.invalidateQueries({ queryKey: payrollKeys.periods() })
      toastSuccess('Run reactivated')
    },
    onError: (error) => toastApiError(error),
  })
}
