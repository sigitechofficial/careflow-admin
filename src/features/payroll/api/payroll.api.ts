import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CreatePayrollScheduleInput,
  CreatePayrollTaxYearInput,
  CreateUkPayrollRunInput,
  UpsertEmployeePayrollProfileInput,
  CreateEmployeePayAgreementInput,
} from '@/features/payroll/types/payroll-api.types'
import type {
  EmployeePayAgreement,
  EmployeePayrollProfile,
  EmployeePayrollSetupRow,
  PayrollOverview,
  PayrollPeriod,
  PayrollSchedule,
  PayrollTaxYear,
  UkPayrollRun,
  UkPayrollRunDetail,
} from '@/features/payroll/types/payroll.types'

export async function fetchPayrollOverview() {
  const res = await apiJson<ApiEnvelope<PayrollOverview>>('/payroll/overview')
  return res.data
}

export async function purgeAllPayrollData() {
  const res = await apiJson<
    ApiEnvelope<{
      runEmployees: number
      runs: number
      agreements: number
      profiles: number
      periods: number
      schedules: number
      taxYears: number
    }>
  >('/payroll/purge-all', {
    method: 'POST',
    body: JSON.stringify({ confirm: 'DELETE ALL PAYROLL' }),
  })
  return res.data
}

export async function fetchPayrollTaxYears() {
  const res = await apiJson<ApiEnvelope<PayrollTaxYear[]>>('/payroll/tax-years')
  return res.data ?? []
}

export async function createPayrollTaxYear(body: CreatePayrollTaxYearInput) {
  const res = await apiJson<ApiEnvelope<PayrollTaxYear>>('/payroll/tax-years', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function activatePayrollTaxYear(id: string) {
  const res = await apiJson<ApiEnvelope<PayrollTaxYear>>(`/payroll/tax-years/${id}/activate`, {
    method: 'POST',
  })
  return res.data
}

export async function ensureUkPayrollTaxYears() {
  const res = await apiJson<
    ApiEnvelope<{
      created: string[]
      existing: string[]
      activated: string | null
      taxYears: PayrollTaxYear[]
    }>
  >('/payroll/tax-years/ensure-uk', { method: 'POST' })
  return res.data
}

export async function fetchPayrollSchedules() {
  const res = await apiJson<ApiEnvelope<PayrollSchedule[]>>('/payroll/schedules')
  return res.data ?? []
}

export async function createPayrollSchedule(body: CreatePayrollScheduleInput) {
  const res = await apiJson<ApiEnvelope<PayrollSchedule>>('/payroll/schedules', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function generatePayrollPeriods(scheduleId: string, taxYearId: string) {
  const res = await apiJson<ApiEnvelope<PayrollPeriod[]>>(
    `/payroll/schedules/${scheduleId}/generate-periods`,
    {
      method: 'POST',
      body: JSON.stringify({ taxYearId }),
    },
  )
  return res.data ?? []
}

export async function fetchPayrollPeriods(params?: { scheduleId?: string; taxYearId?: string }) {
  const search = new URLSearchParams()
  if (params?.scheduleId) search.set('scheduleId', params.scheduleId)
  if (params?.taxYearId) search.set('taxYearId', params.taxYearId)
  const qs = search.toString()
  const res = await apiJson<ApiEnvelope<PayrollPeriod[]>>(`/payroll/periods${qs ? `?${qs}` : ''}`)
  return res.data ?? []
}

export async function fetchPayrollEmployees() {
  const res = await apiJson<ApiEnvelope<EmployeePayrollSetupRow[]>>('/payroll/employees')
  return res.data ?? []
}

export async function upsertEmployeePayrollProfile(
  employeeId: string,
  body: UpsertEmployeePayrollProfileInput,
) {
  const res = await apiJson<ApiEnvelope<EmployeePayrollProfile>>(
    `/payroll/employees/${employeeId}/profile`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function createEmployeePayAgreement(
  employeeId: string,
  body: CreateEmployeePayAgreementInput,
) {
  const res = await apiJson<ApiEnvelope<EmployeePayAgreement>>(
    `/payroll/employees/${employeeId}/pay-agreements`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function fetchUkPayrollRuns() {
  const res = await apiJson<ApiEnvelope<UkPayrollRun[]>>('/payroll/runs')
  return res.data ?? []
}

export async function fetchUkPayrollRun(id: string) {
  const res = await apiJson<ApiEnvelope<UkPayrollRunDetail>>(`/payroll/runs/${id}`)
  return res.data
}

export async function createUkPayrollRun(body: CreateUkPayrollRunInput) {
  const res = await apiJson<ApiEnvelope<UkPayrollRun>>('/payroll/runs', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function enrolUkPayrollRun(id: string, employeeIds?: string[]) {
  const res = await apiJson<ApiEnvelope<UkPayrollRunDetail>>(`/payroll/runs/${id}/enrol`, {
    method: 'POST',
    body: JSON.stringify(employeeIds?.length ? { employeeIds } : {}),
  })
  return res.data
}

export async function calculateUkPayrollGross(id: string) {
  const res = await apiJson<ApiEnvelope<UkPayrollRunDetail>>(`/payroll/runs/${id}/calculate-gross`, {
    method: 'POST',
  })
  return res.data
}

export async function calculateUkPayrollStatutory(id: string) {
  const res = await apiJson<ApiEnvelope<UkPayrollRunDetail>>(
    `/payroll/runs/${id}/calculate-statutory`,
    {
      method: 'POST',
    },
  )
  return res.data
}

export async function closeUkPayrollRun(id: string) {
  const res = await apiJson<ApiEnvelope<UkPayrollRun>>(`/payroll/runs/${id}/close`, {
    method: 'POST',
  })
  return res.data
}

export async function cancelUkPayrollRun(id: string) {
  const res = await apiJson<ApiEnvelope<UkPayrollRun>>(`/payroll/runs/${id}/cancel`, {
    method: 'POST',
  })
  return res.data
}
