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
export type SalaryEntryPeriod = 'ANNUAL' | 'MONTHLY' | 'WEEKLY'
export type SalaryProrationMethod =
  | 'EQUAL_PERIODS_CALENDAR_DAYS'
  | 'EQUAL_PERIODS_WORKING_DAYS'
  | 'CALENDAR_DAYS_365_25'
export type SalaryCoverage = 'ALL_VISIT_WORK' | 'CONTRACTED_HOURS' | 'NO_VISIT_WORK'
export type GuaranteeQualifyingTime = 'VISITS' | 'VISITS_AND_TRAVEL'
export type GuaranteeLeaveTreatment = 'COUNT_PAID_LEAVE_HOURS' | 'REDUCE_FOR_ABSENCE_DAYS'
export type UkPayrollRunStatus =
  | 'DRAFT'
  | 'EMPLOYEES_ENROLLED'
  | 'GROSS_CALCULATED'
  | 'STATUTORY_CALCULATED'
  | 'CLOSED'
  | 'CANCELLED'

export type PayrollTaxCodeGroup = 'STANDARD' | 'SPECIAL' | 'SCOTLAND' | 'WALES'

export type PayrollTaxCode = {
  id: string
  code: string
  label: string
  description: string | null
  group: PayrollTaxCodeGroup
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type PayrollStatutoryRateSet = {
  id: string
  taxYearId: string
  nation: string
  version: number
  isActive: boolean
  personalAllowanceAnnual: number
  basicRateBandAnnual: number
  higherRateThresholdAnnual: number
  additionalRateThresholdAnnual: number
  basicRatePercent: number
  higherRatePercent: number
  additionalRatePercent: number
  niLelWeekly: number
  niPtWeekly: number
  niStWeekly: number
  niUelWeekly: number
  niLelMonthly: number
  niPtMonthly: number
  niStMonthly: number
  niUelMonthly: number
  niEmployeeRateMainPercent: number
  niEmployeeRateUpperPercent: number
  niEmployerRatePercent: number
  sourceNote: string | null
  createdAt: string
  updatedAt: string
  taxYear: {
    id: string
    code: string
    label: string
    isCurrent: boolean
  } | null
}

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
  /** HMRC FPS hours-normally-worked band A–E (T04). */
  hoursNormallyWorked: 'A' | 'B' | 'C' | 'D' | 'E' | null
  /** Previous employer P45 received (T05). */
  p45Received: boolean
  studentLoanPlan1: boolean
  studentLoanPlan2: boolean
  studentLoanPlan4: boolean
  studentLoanPlan5: boolean
  postgraduateLoan: boolean
  pensionOptedIn: boolean
  pensionSchemeRef: string | null
  /** The day the apprenticeship began: decides the apprentice minimum wage rate at 19 or over. */
  apprenticeshipStartDate?: string | null
  /** Gate C7/C8: company director for NI as confirmed; null = not yet classified (tax and NI not calculated). */
  isDirector?: boolean | null
  directorAppointedOn?: string | null
  /** Directors' NIC method: AN (standard annual earnings period) is the only one supported. */
  directorNicMethod?: 'AN' | null
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
  /** How the salary was entered; `annualSalary` is always the yearly figure. */
  salaryEntryPeriod?: SalaryEntryPeriod | null
  salaryEntryAmount?: number | null
  /** How a part period is paid. Empty on an agreement made before methods existed. */
  salaryProrationMethod?: SalaryProrationMethod | null
  /** What work the salary already pays for. Empty = not decided: visit wages are held. */
  salaryCoverage?: SalaryCoverage | null
  /** Guaranteed hours a week (WM-07). A top-up is paid only when `guaranteeTopUp` says so. */
  guaranteedWeeklyHours?: number | null
  guaranteeTopUp?: 'PAY_SHORTFALL' | null
  guaranteeQualifyingTime?: GuaranteeQualifyingTime | null
  guaranteeLeaveTreatment?: GuaranteeLeaveTreatment | null
  createdById?: string | null
  approvedById?: string | null
  approvedAt?: string | null
  createdByName?: string | null
  approvedByName?: string | null
  /** A draft that carries or replaces a salary: a second person approves it. */
  awaitingApproval?: boolean
  currency: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type EmployeeRtiIdentity = {
  isComplete: boolean
  issues: string[]
  genderHmrc: 'M' | 'F' | null
  dateOfBirth: string | null
  addressSummary: string | null
}

export type EmployeePayrollYtd = {
  employeeId: string
  taxYearId: string
  taxYearCode?: string | null
  taxYearLabel?: string | null
  grossPayYtd: number
  taxablePayYtd: number
  incomeTaxYtd: number
  employeeNiYtd: number
  employerNiYtd: number
  netPayYtd: number
  lastClosedRunId: string | null
  updatedAt: string
}

export type EmployeePayrollSetupRow = {
  employeeId: string
  displayName: string
  payrollNumber: string | null
  nationalInsuranceNo: string | null
  defaultPayCardId: string | null
  employmentStartDate?: string | null
  employmentEndDate?: string | null
  profile: EmployeePayrollProfile | null
  activeAgreement: EmployeePayAgreement | null
  rtiIdentity?: EmployeeRtiIdentity
  ytd?: EmployeePayrollYtd | null
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
  /** Value of the source earning this line does not pay, and why. */
  unpaidAmount?: number | null
  unpaidReason?: 'COVERED_BY_SALARY' | 'SALARY_COVERAGE_NOT_DECIDED' | null
  sourcePayrollRunId: string | null
  sourcePayrollRunLineId: string | null
  sourceVisitReconciliationId: string | null
}

/** Closed-run employee row available as an ERA payslip download. */
export type UkPayrollPayslipListItem = {
  runEmployeeId: string
  ukPayrollRunId: string
  employeeId: string
  displayName: string
  payrollNumber: string | null
  runLabel: string
  periodLabel: string
  /** e.g. "Monthly · April 2026 (01/04/2026 – 30/04/2026)" */
  periodCaption: string
  frequencyLabel: string
  paymentDate: string | null
  periodStart: string | null
  periodEnd: string | null
  taxYearCode: string
  scheduleName: string
  frequency: string
  totalGross: number
  incomeTax: number
  employeeNi: number
  netPay: number
  taxCodeApplied: string | null
  niCategoryApplied: string | null
  /** Bank disbursement via Employee payouts (separate from scheduled pay date). */
  bankStatus: 'CALCULATED' | 'APPROVED' | 'PAID'
  bankStatusLabel: string
  bankPaidAt: string | null
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
    /** Mileage and expenses paid with this run's net pay; not wages (TR-13). */
    reimbursementPayable?: number
    /** Part of the expenses whose tax treatment has not been verified. */
    expenseNotVerified?: number
    totalPayable?: number
    /** Earnings the salary already pays for: settled by this run, not paid again (WM-09). */
    coveredBySalary?: number
    /** Earnings held because the pay agreement does not say what the salary pays for. */
    heldForSalaryDecision?: number
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
    ytd?: EmployeePayrollYtd | null
  }>
  /** The user who created the run: they cannot review its minimum wage exceptions. */
  createdById?: string | null
  /** Minimum wage assessments this run made (salaried hours work). */
  nmwAssessments?: UkNmwAssessment[]
  phaseNote?: string
}

export type NmwReviewOutcome = 'EVIDENCE_SUPPORTS_COMPLIANCE' | 'SHORTFALL_CONFIRMED'

/** One employee's minimum wage position for the pay reference period of a UK payroll run. */
export type UkNmwAssessment = {
  id: string
  employeeId: string
  periodStart: string
  periodEnd: string
  workType: string
  category: string
  requiredHourly: number
  /** Pay that counts towards the minimum wage. */
  pay: number
  /** Hours the pay is measured against (basic hours and hours paid on top). */
  hours: number
  workedHours: number
  /** Top-up this run adds to reach the minimum wage. */
  topUp: number
  /** True, false, or null when the period cannot decide it. */
  compliant: boolean | null
  issue: string | null
  issueMessage: string | null
  /** Pay that may be missing (or, once confirmed, is missing). */
  shortfall: number | null
  /** Stops the run being closed. */
  blocksClose: boolean
  /** A review can be recorded: there is an open question of fact. */
  canReview: boolean
  reviewOutcome: NmwReviewOutcome | null
  reviewedAt: string | null
  reviewedByName: string | null
  reviewNote: string | null
  note: string | null
  /** Contracted weekly hours of the agreement in force: the contract's own figure. */
  contractedWeeklyHours?: number | null
  /** Where the worker stands in the calculation year. Empty when the year was not assessed. */
  calcYearStart?: string | null
  calcYearEnd?: string | null
  /** Weeks of the approved annualisation method used. */
  weeksPerYear?: number | null
  annualBasicHours?: number | null
  /** Hours counted in the calculation year before this period. */
  yearHoursBefore?: number | null
  /** Hours beyond the basic hours of the year that this assessment counted. */
  excessHours?: number | null
}

/** How the employer turns contracted weekly hours into basic hours for a year (salaried hours work). */
export type SalariedHoursMethod = {
  id: string
  weeksPerYear: number
  /** Where the method is written down and why it is right for these contracts. */
  basis: string
  effectiveFrom: string
  status: 'DRAFT' | 'APPROVED' | 'WITHDRAWN'
  /** A test fixture, never an employer's policy. */
  isSynthetic: boolean
  createdById: string | null
  createdByName?: string | null
  createdAt: string
  approvedById: string | null
  approvedByName?: string | null
  approvedAt: string | null
  withdrawnAt: string | null
  withdrawnByName?: string | null
  withdrawnNote: string | null
}

export type SalariedHoursMethods = {
  /** The approved method that applies today, if any. */
  inForce: SalariedHoursMethod | null
  methods: SalariedHoursMethod[]
}

export type PayrollOverview = {
  taxYearCount: number
  scheduleCount: number
  periodCount: number
  readyEmployeeProfiles: number
  openRuns: number
  currentTaxYear: PayrollTaxYear | null
  employerSettingsComplete?: boolean
  employerFullPayeReference?: string | null
  phaseNote: string
}

/** Org-level HMRC employer identity for FPS/EPS (T01). */
export type PayrollEmployerSettings = {
  id: string
  hmrcOfficeNumber: string | null
  employerPayeReference: string | null
  accountsOfficeReference: string | null
  taxDistrict: string | null
  employerTradingName: string | null
  notes: string | null
  fullPayeReference: string | null
  isComplete: boolean
  /** T02 — which Gateway environment Care will use for RTI. */
  activeHmrcEnvironment: 'TEST' | 'LIVE'
  gatewayTestUserId: string | null
  gatewayLiveUserId: string | null
  hasTestPassword: boolean
  hasLivePassword: boolean
  gatewayCredentialsUpdatedAt: string | null
  gatewayCredentialsReady: boolean
  employmentAllowanceClaimed: boolean
  createdAt: string
  updatedAt: string
}

/** Care-owned EPS preview (T14) — not GovTalk XML. */
export type CareEpsPayload = {
  meta: {
    schemaVersion: 'care-eps-preview-1'
    generatedAt: string
    purpose: 'PREVIEW'
  }
  employer: {
    hmrcOfficeNumber: string
    employerPayeReference: string
    fullPayeReference: string
    accountsOfficeReference: string
    employerTradingName: string | null
  }
  period: {
    taxYearCode: string
    relatedTaxYear: string
    taxMonth: number
    taxMonthStart: string
    taxMonthEnd: string
    electronicDeadline: string
    daysUntilDeadline: number | null
    deadlineStatus: 'OK' | 'DUE_SOON' | 'OVERDUE' | 'UNKNOWN'
  }
  indicators: {
    noPaymentThisPeriod: boolean
    employmentAllowanceClaimed: boolean
  }
  recoveries: {
    smpRecovered: number
    sppRecovered: number
    sapRecovered: number
    shppRecovered: number
    spbpRecovered: number
    nicCompensationOnStatutory: number
  }
  context: {
    closedRunsInTaxMonth: number
    employeesPaidInTaxMonth: number
    suggestedNilPayment: boolean
  }
  warnings: string[]
  validation: {
    isReadyToSubmit: boolean
    errorCount: number
    warningCount: number
    items: Array<{
      severity: 'error' | 'warning'
      code: string
      field?: string
      message: string
    }>
  }
}

/** Care-owned FPS preview (T12) — not GovTalk XML. */
export type CareFpsPayload = {
  meta: {
    schemaVersion: 'care-fps-preview-1'
    generatedAt: string
    ukPayrollRunId: string
    runStatus: string
    taxYearCode: string
    purpose: 'PREVIEW'
  }
  employer: {
    hmrcOfficeNumber: string
    employerPayeReference: string
    fullPayeReference: string
    accountsOfficeReference: string
    employerTradingName: string | null
  }
  submission: {
    relatedTaxYear: string
    taxMonthOrWeekNumber: number
    payFrequency: string
    paymentDate: string
    periodStart: string
    periodEnd: string
  }
  employees: Array<{
    employeeId: string
    name: { forename: string; surname: string }
    birthDate: string | null
    gender: 'M' | 'F' | null
    nino: string | null
    payId: string | null
    address: {
      line1: string | null
      line2: string | null
      city: string | null
      county: string | null
      postcode: string | null
      country: string | null
    }
    employment: {
      taxCode: string | null
      week1Month1: boolean
      niCategory: string | null
      starterDeclaration: string | null
      hoursNormallyWorked: 'A' | 'B' | 'C' | 'D' | 'E' | null
      startingDate: string | null
      leavingDate: string | null
      isStarterInPeriod: boolean
      isLeaverInPeriod: boolean
      isFirstPayOfEmployment: boolean
      isLastPayOfEmployment: boolean
      p45Received: boolean
    }
    payment: {
      taxablePay: number
      taxDeductedOrRefunded: number
      employeeNiContribution: number
      employerNiContribution: number
      periodGross: number
      periodNetPay: number
      taxablePayYtd: number
      totalTaxYtd: number
      employeeNiYtd: number
      employerNiYtd: number
      grossPayYtd: number
      netPayYtd: number
    }
    issues: string[]
  }>
  totals: {
    employeeCount: number
    totalGross: number
    totalIncomeTax: number
    totalEmployeeNi: number
    totalEmployerNi: number
    totalNetPay: number
  }
  warnings: string[]
  /** T13 — structured checks before HMRC TEST send (T16). */
  validation: {
    isReadyToSubmit: boolean
    errorCount: number
    warningCount: number
    items: Array<{
      severity: 'error' | 'warning'
      code: string
      scope: 'run' | 'employer' | 'submission' | 'employee'
      employeeId?: string
      employeeName?: string
      field?: string
      message: string
    }>
  }
}

/** T16 — HMRC RTI submission attempt (passwords never returned). */
export type PayrollHmrcSubmissionAuditEvent = {
  id: string
  submissionId: string
  eventType: string
  actorUserId: string | null
  fromStatus: string | null
  toStatus: string
  payloadFingerprint: string | null
  correlationId: string | null
  responseSha256: string | null
  httpStatus: number | null
  detail: unknown
  createdAt: string
}

export type PayrollHmrcSubmission = {
  id: string
  ukPayrollRunId: string | null
  taxYearId?: string | null
  taxMonth?: number | null
  documentType: string
  mode: 'DRY_RUN' | 'SUBMIT' | string
  environment: 'TEST' | 'LIVE' | string
  status: string
  correlationId: string | null
  gatewayUserId: string | null
  vendorId: string | null
  submissionUrl: string | null
  hasRequestXml: boolean
  hasResponseXml: boolean
  httpStatus: number | null
  qualifier: string | null
  functionCode: string | null
  errorCode: string | null
  errorMessage: string | null
  acknowledgement: unknown
  /** T17 — Gov-* header snapshot (connection method, headers, omitted). */
  fraudPreventionHeaders?: {
    connectionMethod?: string
    headers?: Record<string, string>
    omitted?: string[]
    collectedAt?: string
  } | null
  payloadFingerprint?: string | null
  approvedById?: string | null
  approvedAt?: string | null
  rejectedById?: string | null
  rejectedAt?: string | null
  rejectionNote?: string | null
  createdAt: string
  createdById: string | null
  /** T20 — DRAFT | AWAITING_APPROVAL | SUBMITTED | ACKNOWLEDGED | ACCEPTED | REJECTED */
  lifecycleStage?: string
  canDownloadPayload?: boolean
  canRetry?: boolean
  requestXmlRedacted?: string | null
  responseXml?: string | null
  /** T21 — SHA-256 of stored gateway response (when present). */
  responseSha256?: string | null
  /** T21 — append-only lifecycle events (detail endpoints). */
  auditEvents?: PayrollHmrcSubmissionAuditEvent[]
}
