export type PayrollTaxYearStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'
export type PayrollPayFrequency = 'WEEKLY' | 'FORTNIGHTLY' | 'FOUR_WEEKLY' | 'MONTHLY'
export type PayrollScheduleStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type PayrollPeriodStatus = 'OPEN' | 'IN_RUN' | 'CLOSED'
export type EmployeePayrollProfileStatus = 'DRAFT' | 'READY' | 'SUSPENDED'
export type PayrollStarterDeclaration =
  | 'UNKNOWN'
  | 'A_FIRST_JOB'
  | 'B_ONLY_JOB_THIS_YEAR'
  | 'C_HAS_ANOTHER_JOB_OR_PENSION'
export type PayrollNiCategory =
  | 'A'
  | 'B'
  | 'C'
  | 'F'
  | 'H'
  | 'I'
  | 'J'
  | 'L'
  | 'M'
  | 'S'
  | 'V'
  | 'Z'
  | 'X'
export type EmployeePayAgreementBasis = 'HOURLY_CARE' | 'SALARIED' | 'HYBRID'
export type EmployeePayAgreementStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'TERMINATED'
export type UkPayrollRunStatus =
  | 'DRAFT'
  | 'EMPLOYEES_ENROLLED'
  | 'GROSS_CALCULATED'
  | 'STATUTORY_CALCULATED'
  | 'CLOSED'
  | 'CANCELLED'

export type PayrollTaxYear = {
  id: string
  code: string
  label: string
  startDate: string
  endDate: string
  isCurrent: boolean
  status: PayrollTaxYearStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type PayrollSchedule = {
  id: string
  name: string
  code: string
  frequency: PayrollPayFrequency
  anchorDay: number
  description: string | null
  status: PayrollScheduleStatus
  createdAt: string
  updatedAt: string
}

export type PayrollPeriod = {
  id: string
  scheduleId: string
  taxYearId: string
  sequence: number
  label: string
  periodStart: string
  periodEnd: string
  paymentDate: string
  status: PayrollPeriodStatus
  createdAt: string
  updatedAt: string
}

export type EmployeePayrollProfile = {
  id: string
  employeeId: string
  scheduleId: string | null
  status: EmployeePayrollProfileStatus
  taxCode: string | null
  taxCodeWeek1Month1: boolean
  niCategory: PayrollNiCategory | null
  starterDeclaration: PayrollStarterDeclaration
  studentLoanPlan1: boolean
  studentLoanPlan2: boolean
  studentLoanPlan4: boolean
  studentLoanPlan5: boolean
  postgraduateLoan: boolean
  pensionOptedIn: boolean
  pensionSchemeRef: string | null
  deductionElections: string[]
  bankSortCode: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type EmployeePayAgreement = {
  id: string
  employeeId: string
  scheduleId: string | null
  basis: EmployeePayAgreementBasis
  status: EmployeePayAgreementStatus
  effectiveFrom: string
  effectiveTo: string | null
  payCardId: string | null
  annualSalary: number | null
  contractedHours: number | null
  hourlyRateOverride: number | null
  currency: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type EmployeePayrollSetupRow = {
  employeeId: string
  displayName: string
  payrollNumber: string | null
  nationalInsuranceNo: string | null
  defaultPayCardId: string | null
  profile: EmployeePayrollProfile | null
  activeAgreement: EmployeePayAgreement | null
}

export type UkPayrollRun = {
  id: string
  periodId: string
  taxYearId: string
  scheduleId: string
  runNumber: number
  label: string
  status: UkPayrollRunStatus
  employeeCount: number
  totalGross: number
  totalExpenses: number
  grossCalculatedAt: string | null
  totalIncomeTax: number
  totalEmployeeNi: number
  totalEmployerNi: number
  totalNetPay: number
  statutoryCalculatedAt: string | null
  statutoryBasis: string | null
  currency: string
  notes: string | null
  closedAt: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  period?: PayrollPeriod
  schedule?: PayrollSchedule
  taxYear?: PayrollTaxYear
}

export type UkPayrollInputLine = {
  id: string
  sourceType: string
  lineType: string
  description: string
  minutes: number | null
  amount: number
  isExpense: boolean
  isProvisional: boolean
  sourcePayrollRunId: string | null
  sourcePayrollRunLineId: string | null
  sourceVisitReconciliationId: string | null
}

export type UkPayrollRunDetail = UkPayrollRun & {
  employees: Array<{
    id: string
    employeeId: string
    payAgreementId: string | null
    enrolledAt: string
    notes: string | null
    displayName: string
    payrollNumber: string | null
    visitPay: number
    salaryPay: number
    travelPay: number
    nmwTopUp: number
    otherPay: number
    expenseTotal: number
    deductionTotal: number
    totalGross: number
    inputLineCount: number
    hasProvisionalInputs: boolean
    grossCalculatedAt: string | null
    taxablePay: number
    incomeTax: number
    employeeNi: number
    employerNi: number
    netPay: number
    taxCodeApplied: string | null
    niCategoryApplied: string | null
    statutoryExplanation: string | null
    statutoryCalculatedAt: string | null
    inputLines: UkPayrollInputLine[]
  }>
  phaseNote?: string
}

export type PayrollOverview = {
  taxYearCount: number
  scheduleCount: number
  periodCount: number
  readyEmployeeProfiles: number
  openRuns: number
  currentTaxYear: PayrollTaxYear | null
  phaseNote: string
}
