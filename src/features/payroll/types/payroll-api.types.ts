import type {
  EmployeePayAgreementBasis,
  EmployeePayAgreementStatus,
  EmployeePayrollProfileStatus,
  PayrollNiCategory,
  PayrollPayFrequency,
  PayrollStarterDeclaration,
} from '@/features/payroll/types/payroll.types'

export type CreatePayrollTaxYearInput = {
  code: string
  label: string
  startDate: string
  endDate: string
  notes?: string
}

export type CreatePayrollScheduleInput = {
  name: string
  code: string
  frequency: PayrollPayFrequency
  anchorDay?: number
  description?: string
}

export type UpsertEmployeePayrollProfileInput = {
  scheduleId?: string | null
  status?: EmployeePayrollProfileStatus
  taxCode?: string | null
  taxCodeWeek1Month1?: boolean
  niCategory?: PayrollNiCategory | null
  starterDeclaration?: PayrollStarterDeclaration
  studentLoanPlan1?: boolean
  studentLoanPlan2?: boolean
  studentLoanPlan4?: boolean
  studentLoanPlan5?: boolean
  postgraduateLoan?: boolean
  pensionOptedIn?: boolean
  deductionElections?: string[]
  pensionSchemeRef?: string | null
  bankSortCode?: string | null
  bankAccountNumber?: string | null
  bankAccountName?: string | null
  notes?: string | null
}

export type CreateEmployeePayAgreementInput = {
  basis: EmployeePayAgreementBasis
  effectiveFrom: string
  effectiveTo?: string | null
  scheduleId?: string | null
  payCardId?: string | null
  annualSalary?: number | null
  contractedHours?: number | null
  hourlyRateOverride?: number | null
  status?: EmployeePayAgreementStatus
  notes?: string | null
}

export type CreateUkPayrollRunInput = {
  periodId: string
  notes?: string
}
