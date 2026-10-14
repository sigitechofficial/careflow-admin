import type {
  EmployeePayAgreementBasis,
  EmployeePayAgreementStatus,
  GuaranteeLeaveTreatment,
  GuaranteeQualifyingTime,
  SalaryCoverage,
  SalaryEntryPeriod,
  SalaryProrationMethod,
  EmployeePayrollProfileStatus,
  PayrollNiCategory,
  PayrollPayFrequency,
  PayrollScheduleStatus,
  PayrollStarterDeclaration,
  PayrollTaxCodeGroup,
} from '@/features/payroll/types/payroll.types'

export type CreatePayrollTaxYearInput = {
  code: string
  label: string
  startDate: string
  endDate: string
  notes?: string
}

export type CreatePayrollTaxCodeInput = {
  code: string
  label: string
  description?: string | null
  group?: PayrollTaxCodeGroup
  sortOrder?: number
  isActive?: boolean
}

export type UpdatePayrollTaxCodeInput = {
  code?: string
  label?: string
  description?: string | null
  group?: PayrollTaxCodeGroup
  sortOrder?: number
  isActive?: boolean
}

export type UpdatePayrollStatutoryRatesInput = {
  personalAllowanceAnnual?: number
  basicRateBandAnnual?: number
  higherRateThresholdAnnual?: number
  additionalRateThresholdAnnual?: number
  basicRatePercent?: number
  higherRatePercent?: number
  additionalRatePercent?: number
  niEmployeeRateMainPercent?: number
  niEmployeeRateUpperPercent?: number
  niEmployerRatePercent?: number
  niLelWeekly?: number
  niPtWeekly?: number
  niStWeekly?: number
  niUelWeekly?: number
  niLelMonthly?: number
  niPtMonthly?: number
  niStMonthly?: number
  niUelMonthly?: number
  sourceNote?: string | null
}

export type CreatePayrollScheduleInput = {
  name: string
  code: string
  frequency: PayrollPayFrequency
  anchorDay?: number
  description?: string
}

export type UpdatePayrollScheduleInput = {
  name?: string
  code?: string
  frequency?: PayrollPayFrequency
  anchorDay?: number
  description?: string | null
  status?: PayrollScheduleStatus
}

export type UpsertEmployeePayrollProfileInput = {
  scheduleId?: string | null
  status?: EmployeePayrollProfileStatus
  taxCode?: string | null
  taxCodeWeek1Month1?: boolean
  niCategory?: PayrollNiCategory | null
  starterDeclaration?: PayrollStarterDeclaration
  hoursNormallyWorked?: 'A' | 'B' | 'C' | 'D' | 'E' | null
  p45Received?: boolean
  studentLoanPlan1?: boolean
  studentLoanPlan2?: boolean
  studentLoanPlan4?: boolean
  studentLoanPlan5?: boolean
  postgraduateLoan?: boolean
  pensionOptedIn?: boolean
  deductionElections?: string[]
  pensionSchemeRef?: string | null
  apprenticeshipStartDate?: string | null
  isDirector?: boolean | null
  directorAppointedOn?: string | null
  directorNicMethod?: 'AN' | null
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
  salaryEntryPeriod?: SalaryEntryPeriod | null
  salaryEntryAmount?: number | null
  salaryProrationMethod?: SalaryProrationMethod | null
  salaryCoverage?: SalaryCoverage | null
  guaranteedWeeklyHours?: number | null
  guaranteeTopUp?: 'PAY_SHORTFALL' | null
  guaranteeQualifyingTime?: GuaranteeQualifyingTime | null
  guaranteeLeaveTreatment?: GuaranteeLeaveTreatment | null
  status?: EmployeePayAgreementStatus
  notes?: string | null
}

export type CreateUkPayrollRunInput = {
  periodId: string
  notes?: string
}

export type UpdatePayrollEmployerSettingsInput = {
  hmrcOfficeNumber?: string | null
  employerPayeReference?: string | null
  accountsOfficeReference?: string | null
  taxDistrict?: string | null
  employerTradingName?: string | null
  notes?: string | null
  activeHmrcEnvironment?: 'TEST' | 'LIVE'
  gatewayTestUserId?: string | null
  gatewayTestPassword?: string | null
  clearTestPassword?: boolean
  gatewayLiveUserId?: string | null
  gatewayLivePassword?: string | null
  clearLivePassword?: boolean
  employmentAllowanceClaimed?: boolean
}

export type PreviewEpsQuery = {
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
}

/** Gate C14: body of POST /payroll/employees/:id/loan-notices (C13 RecordLoanNoticeDto). */
export type RecordLoanNoticeInput = {
  noticeType: 'SL1' | 'SL2' | 'PGL1' | 'PGL2'
  studentLoanPlan?: '1' | '2' | '4' | '5'
  hmrcReference?: string
  noticeDate: string
  receivedOn: string
  effectivePayday: string
  notes?: string
}
