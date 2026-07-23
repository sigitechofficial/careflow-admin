/**
 * Complete UK employee payroll taxes & deductions catalogue — tax year 2026/27
 * (6 April 2026 – 5 April 2027).
 *
 * Sources: GOV.UK employer rates / deductions guidance.
 * Care capability status is explicit so we never imply fake engines.
 */

export type UkPayrollItemKind =
  | 'EMPLOYEE_TAX'
  | 'STATUTORY_DEDUCTION'
  | 'VOLUNTARY_DEDUCTION'
  | 'BENEFIT_IN_KIND'
  | 'EMPLOYER_LIABILITY'

export type UkPayrollItemStatus =
  /** Calculated on UK payroll run today (PAYE + Class 1 NI). */
  | 'CALCULATED'
  /** Stored on employee profile; £ amount not calculated yet. */
  | 'CONFIGURED'
  /** Documented for enterprise roadmap; not editable on profile yet. */
  | 'DEFERRED'
  /** Informational only — never deduct from employee net. */
  | 'EMPLOYER_ONLY'

export type UkPayrollCatalogItem = {
  code: string
  name: string
  kind: UkPayrollItemKind
  status: UkPayrollItemStatus
  description: string
  searchable: string
}

export const UK_TAX_YEAR_2026_27 = {
  code: '2026-27',
  label: 'Tax year 2026-27',
  startDate: '2026-04-06',
  endDate: '2027-04-05',
} as const

export const UK_PAYROLL_CATALOG_2026_27: UkPayrollCatalogItem[] = [
  // ── 1. Employee taxes ──────────────────────────────────────────────
  {
    code: 'PAYE_INCOME_TAX',
    name: 'PAYE Income Tax',
    kind: 'EMPLOYEE_TAX',
    status: 'CALCULATED',
    description:
      'Income Tax deducted via PAYE using the employee tax code. PAYE is the collection system, not a separate tax.',
    searchable: 'paye income tax tax code 1257L',
  },
  {
    code: 'EMPLOYEE_CLASS1_NI',
    name: 'Employee Class 1 National Insurance',
    kind: 'EMPLOYEE_TAX',
    status: 'CALCULATED',
    description: 'Primary Class 1 NIC on earnings in each pay period (NI category letter).',
    searchable: 'employee national insurance class 1 nic primary',
  },
  {
    code: 'TAX_ON_BIK',
    name: 'Income Tax on taxable benefits in kind',
    kind: 'EMPLOYEE_TAX',
    status: 'DEFERRED',
    description:
      'Tax on benefits such as company cars, private medical, accommodation, beneficial loans — via payroll or tax code.',
    searchable: 'benefits in kind company car medical accommodation loan',
  },
  {
    code: 'TAX_ON_TERMINATION',
    name: 'Income Tax on taxable termination payments',
    kind: 'EMPLOYEE_TAX',
    status: 'DEFERRED',
    description: 'Applies where all or part of a termination payment is taxable.',
    searchable: 'termination redundancy settlement',
  },
  {
    code: 'TAX_NI_ON_TIPS',
    name: 'Tax and potentially NIC on tips',
    kind: 'EMPLOYEE_TAX',
    status: 'DEFERRED',
    description: 'Tips are subject to Income Tax; NI depends on how tips/tronc are managed.',
    searchable: 'tips tronc service charge',
  },

  // ── 2. Government / statutory deductions (not taxes) ───────────────
  {
    code: 'SL_PLAN_1',
    name: 'Student Loan Plan 1',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Student loan repayment Plan 1 through payroll.',
    searchable: 'student loan plan 1',
  },
  {
    code: 'SL_PLAN_2',
    name: 'Student Loan Plan 2',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Student loan repayment Plan 2 through payroll.',
    searchable: 'student loan plan 2',
  },
  {
    code: 'SL_PLAN_4',
    name: 'Student Loan Plan 4',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Student loan repayment Plan 4 (Scotland) through payroll.',
    searchable: 'student loan plan 4 scotland',
  },
  {
    code: 'SL_PLAN_5',
    name: 'Student Loan Plan 5',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Student loan repayment Plan 5 through payroll.',
    searchable: 'student loan plan 5',
  },
  {
    code: 'POSTGRAD_LOAN',
    name: 'Postgraduate Loan',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Postgraduate loan repayment through payroll.',
    searchable: 'postgraduate loan pgl',
  },
  {
    code: 'PENSION_EMPLOYEE',
    name: 'Workplace pension employee contribution',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Employee pension contribution (auto-enrolment / scheme). Not a tax.',
    searchable: 'pension auto enrolment employee contribution',
  },
  {
    code: 'CMS_DEO',
    name: 'Child Maintenance Deduction from Earnings Order',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'CMS Deduction from Earnings Order.',
    searchable: 'child maintenance cms deo',
  },
  {
    code: 'DEA_DWP',
    name: 'Direct Earnings Attachment (DWP / benefit debt)',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Direct Earnings Attachment for DWP or benefit debt.',
    searchable: 'direct earnings attachment dwp dea',
  },
  {
    code: 'AEO_CIVIL',
    name: 'Attachment of Earnings Order (civil debt)',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Court attachment for civil debt.',
    searchable: 'attachment of earnings civil debt aeo',
  },
  {
    code: 'AEO_COUNCIL_TAX',
    name: 'Council Tax Attachment of Earnings Order',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Council Tax AEO — only when an order is issued (not ordinary Council Tax).',
    searchable: 'council tax attachment aeo',
  },
  {
    code: 'AEO_FINES_MAINT',
    name: 'Attachment order for court fines or maintenance',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Attachment for court fines or maintenance.',
    searchable: 'court fine maintenance attachment',
  },
  {
    code: 'SCOT_EA',
    name: 'Scottish Earnings Arrestment',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Scottish Earnings Arrestment order.',
    searchable: 'scotland earnings arrestment',
  },
  {
    code: 'SCOT_CMA',
    name: 'Scottish Current Maintenance Arrestment',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Scottish Current Maintenance Arrestment.',
    searchable: 'scotland current maintenance arrestment',
  },
  {
    code: 'SCOT_CAO',
    name: 'Scottish Conjoined Arrestment Order',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Scottish Conjoined Arrestment Order.',
    searchable: 'scotland conjoined arrestment',
  },
  {
    code: 'NI_AEO',
    name: 'Northern Ireland Attachment of Earnings Order',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'NI Attachment of Earnings Order.',
    searchable: 'northern ireland attachment earnings',
  },
  {
    code: 'OTHER_STATUTORY_ORDER',
    name: 'Other statutory payment order',
    kind: 'STATUTORY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Other court or public-authority order processed through payroll.',
    searchable: 'other statutory order court authority',
  },

  // ── 3. Voluntary / contractual ─────────────────────────────────────
  {
    code: 'AVC_PENSION',
    name: 'Additional voluntary pension contributions',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Extra employee pension contributions by agreement.',
    searchable: 'avc additional voluntary contribution pension',
  },
  {
    code: 'SS_PENSION',
    name: 'Salary-sacrifice pension contribution',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Pension via salary sacrifice arrangement.',
    searchable: 'salary sacrifice pension',
  },
  {
    code: 'SS_CYCLE',
    name: 'Cycle-to-Work salary sacrifice',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Cycle to Work scheme salary sacrifice.',
    searchable: 'cycle to work bike salary sacrifice',
  },
  {
    code: 'SS_EV',
    name: 'Electric-car salary sacrifice',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Electric vehicle salary sacrifice.',
    searchable: 'electric car ev salary sacrifice',
  },
  {
    code: 'HOLIDAY_PURCHASE',
    name: 'Holiday purchase scheme',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Bought holiday / flexi leave purchase.',
    searchable: 'holiday purchase buy leave',
  },
  {
    code: 'CHILDCARE_VOUCHERS',
    name: 'Childcare vouchers (legacy)',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Legacy childcare vouchers where still eligible.',
    searchable: 'childcare vouchers legacy',
  },
  {
    code: 'PAYROLL_GIVING',
    name: 'Payroll Giving / Give As You Earn',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Charitable donations via payroll.',
    searchable: 'payroll giving gaye charity donation',
  },
  {
    code: 'TRADE_UNION',
    name: 'Trade-union subscription',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Union subs deducted by agreement.',
    searchable: 'trade union subscription',
  },
  {
    code: 'PROF_BODY',
    name: 'Professional-body subscription',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Professional body fees where authorised.',
    searchable: 'professional body subscription',
  },
  {
    code: 'PRIVATE_MEDICAL',
    name: 'Private medical or dental contribution',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Employee share of private medical/dental.',
    searchable: 'private medical dental',
  },
  {
    code: 'LIFE_INSURANCE',
    name: 'Life-insurance contribution',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Life insurance contribution via payroll.',
    searchable: 'life insurance',
  },
  {
    code: 'CAR_FUEL_CONTRIB',
    name: 'Company car or private-fuel contribution',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Employee contribution toward company car / fuel.',
    searchable: 'company car fuel contribution',
  },
  {
    code: 'PARKING',
    name: 'Workplace parking',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Parking charge deduction.',
    searchable: 'parking workplace',
  },
  {
    code: 'MEALS',
    name: 'Meals or canteen charges',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Canteen / meal charges.',
    searchable: 'meals canteen',
  },
  {
    code: 'ACCOMMODATION',
    name: 'Employer-provided accommodation charge',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Charge for employer-provided accommodation.',
    searchable: 'accommodation lodging',
  },
  {
    code: 'UNIFORM',
    name: 'Uniform or equipment charges',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Uniform/equipment where legally permitted.',
    searchable: 'uniform equipment',
  },
  {
    code: 'SEASON_TICKET',
    name: 'Season-ticket loan repayment',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Repayment of season-ticket loan.',
    searchable: 'season ticket loan',
  },
  {
    code: 'SALARY_ADVANCE',
    name: 'Employer loan or salary-advance repayment',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Repayment of advance or employer loan.',
    searchable: 'salary advance loan repayment',
  },
  {
    code: 'OVERPAYMENT_RECOVERY',
    name: 'Recovery of wage or expense overpayment',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Recovery of earlier overpayment.',
    searchable: 'overpayment recovery',
  },
  {
    code: 'SHARE_PLAN',
    name: 'Employee share-plan contribution',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Share / SAYE plan contribution.',
    searchable: 'share plan saye',
  },
  {
    code: 'WORKPLACE_SAVINGS',
    name: 'Workplace savings scheme',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Workplace savings deduction.',
    searchable: 'savings scheme',
  },
  {
    code: 'BENEFIT_PLAN',
    name: 'Employee benefit-plan contributions',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Flexible benefit plan contributions.',
    searchable: 'benefit plan flex',
  },
  {
    code: 'EMPLOYEE_REQUESTED',
    name: 'Employee-requested deductions',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Other deductions with written employee agreement.',
    searchable: 'employee requested deduction',
  },
  {
    code: 'CONTRACTUAL',
    name: 'Contractually authorised deductions',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Deductions authorised by the employment contract.',
    searchable: 'contractual deduction',
  },
  {
    code: 'STRIKE',
    name: 'Strike or industrial-action deductions',
    kind: 'VOLUNTARY_DEDUCTION',
    status: 'CONFIGURED',
    description: 'Deductions related to industrial action where lawful.',
    searchable: 'strike industrial action',
  },

  // ── 4. Benefits in kind (taxable categories) ───────────────────────
  {
    code: 'BIK_COMPANY_CAR',
    name: 'Company cars',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Taxable company car benefit.',
    searchable: 'bik company car',
  },
  {
    code: 'BIK_VAN',
    name: 'Company vans',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Taxable company van benefit.',
    searchable: 'bik van',
  },
  {
    code: 'BIK_PRIVATE_FUEL',
    name: 'Private fuel',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Private fuel benefit.',
    searchable: 'bik private fuel',
  },
  {
    code: 'BIK_MEDICAL',
    name: 'Private medical or dental insurance',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Employer-paid private medical/dental.',
    searchable: 'bik medical dental insurance',
  },
  {
    code: 'BIK_ACCOMMODATION',
    name: 'Living accommodation',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Living accommodation benefit.',
    searchable: 'bik living accommodation',
  },
  {
    code: 'BIK_LOAN',
    name: 'Interest-free or low-interest beneficial loans',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Beneficial loan interest benefit.',
    searchable: 'bik beneficial loan',
  },
  {
    code: 'BIK_VOUCHERS',
    name: 'Vouchers and credit tokens',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Vouchers / credit tokens benefit.',
    searchable: 'bik vouchers tokens',
  },
  {
    code: 'BIK_ASSET_TRANSFER',
    name: 'Assets transferred to an employee',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Assets transferred as a benefit.',
    searchable: 'bik assets transferred',
  },
  {
    code: 'BIK_ASSET_USE',
    name: 'Assets available for private use',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Private use of employer assets.',
    searchable: 'bik assets private use',
  },
  {
    code: 'BIK_PERSONAL_BILLS',
    name: 'Employer-paid personal bills',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Personal bills paid by employer.',
    searchable: 'bik personal bills',
  },
  {
    code: 'BIK_TRAVEL',
    name: 'Non-exempt travel and subsistence',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Non-exempt travel/subsistence.',
    searchable: 'bik travel subsistence',
  },
  {
    code: 'BIK_MEALS',
    name: 'Non-exempt meals and entertainment',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Non-exempt meals/entertainment.',
    searchable: 'bik meals entertainment',
  },
  {
    code: 'BIK_RELOCATION',
    name: 'Relocation expenses above exemptions',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Relocation above exempt limits.',
    searchable: 'bik relocation',
  },
  {
    code: 'BIK_CHILDCARE',
    name: 'Childcare that does not qualify for exemption',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Non-exempt childcare benefit.',
    searchable: 'bik childcare',
  },
  {
    code: 'BIK_SERVICES',
    name: 'Employer-provided services',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Other employer-provided services.',
    searchable: 'bik services',
  },
  {
    code: 'BIK_SHARES',
    name: 'Shares and securities',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Employment-related securities.',
    searchable: 'bik shares securities',
  },
  {
    code: 'BIK_GIFTS',
    name: 'Gifts and awards (non-exempt)',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Gifts/awards outside trivial benefits exemption.',
    searchable: 'bik gifts awards trivial',
  },
  {
    code: 'BIK_OTHER',
    name: 'Other taxable expenses reimbursed',
    kind: 'BENEFIT_IN_KIND',
    status: 'DEFERRED',
    description: 'Other taxable reimbursed expenses.',
    searchable: 'bik other expenses',
  },

  // ── Employer-side (never from employee net) ────────────────────────
  {
    code: 'ER_CLASS1_NI',
    name: 'Employer Class 1 National Insurance',
    kind: 'EMPLOYER_LIABILITY',
    status: 'CALCULATED',
    description: 'Secondary Class 1 NIC — employer cost, not deducted from net pay.',
    searchable: 'employer national insurance secondary class 1',
  },
  {
    code: 'ER_CLASS1A_NI',
    name: 'Class 1A National Insurance',
    kind: 'EMPLOYER_LIABILITY',
    status: 'EMPLOYER_ONLY',
    description: 'Employer NIC on taxable benefits / certain termination payments.',
    searchable: 'class 1a ni benefits',
  },
  {
    code: 'ER_CLASS1B_NI',
    name: 'Class 1B National Insurance',
    kind: 'EMPLOYER_LIABILITY',
    status: 'EMPLOYER_ONLY',
    description: 'Employer NIC on PAYE Settlement Agreement items.',
    searchable: 'class 1b ni psa',
  },
  {
    code: 'ER_APPRENTICESHIP_LEVY',
    name: 'Apprenticeship Levy',
    kind: 'EMPLOYER_LIABILITY',
    status: 'EMPLOYER_ONLY',
    description: 'Employer levy where annual pay bill exceeds threshold.',
    searchable: 'apprenticeship levy',
  },
  {
    code: 'ER_PENSION',
    name: 'Employer pension contribution',
    kind: 'EMPLOYER_LIABILITY',
    status: 'EMPLOYER_ONLY',
    description: 'Employer workplace pension contribution — not a tax.',
    searchable: 'employer pension contribution',
  },
  {
    code: 'ER_PSA',
    name: 'PAYE Settlement Agreement payment',
    kind: 'EMPLOYER_LIABILITY',
    status: 'EMPLOYER_ONLY',
    description: 'Employer pays agreed tax/NIC on certain minor benefits via PSA.',
    searchable: 'paye settlement agreement psa',
  },
]

export const UK_PAYROLL_KIND_LABEL: Record<UkPayrollItemKind, string> = {
  EMPLOYEE_TAX: 'Employee taxes',
  STATUTORY_DEDUCTION: 'Government & statutory deductions',
  VOLUNTARY_DEDUCTION: 'Voluntary / contractual deductions',
  BENEFIT_IN_KIND: 'Taxable benefits in kind',
  EMPLOYER_LIABILITY: 'Employer-side liabilities',
}

export const UK_PAYROLL_STATUS_LABEL: Record<UkPayrollItemStatus, string> = {
  CALCULATED: 'Calculated on run',
  CONFIGURED: 'Configurable on profile',
  DEFERRED: 'Roadmap (not editable yet)',
  EMPLOYER_ONLY: 'Employer only — not from net pay',
}

/** Codes that can be toggled on an employee payroll profile. */
export const UK_CONFIGURABLE_DEDUCTION_CODES = UK_PAYROLL_CATALOG_2026_27.filter(
  (i) => i.status === 'CONFIGURED',
).map((i) => i.code)

export function filterUkPayrollCatalog(query: string, kind?: UkPayrollItemKind) {
  const q = query.trim().toLowerCase()
  return UK_PAYROLL_CATALOG_2026_27.filter((item) => {
    if (kind && item.kind !== kind) return false
    if (!q) return true
    return (
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.searchable.toLowerCase().includes(q)
    )
  })
}

export function syncLoanFlagsFromElections(codes: string[]) {
  const set = new Set(codes)
  return {
    studentLoanPlan1: set.has('SL_PLAN_1'),
    studentLoanPlan2: set.has('SL_PLAN_2'),
    studentLoanPlan4: set.has('SL_PLAN_4'),
    studentLoanPlan5: set.has('SL_PLAN_5'),
    postgraduateLoan: set.has('POSTGRAD_LOAN'),
    pensionOptedIn: set.has('PENSION_EMPLOYEE') || set.has('AVC_PENSION') || set.has('SS_PENSION'),
  }
}

export function electionsFromLegacyFlags(flags: {
  studentLoanPlan1?: boolean
  studentLoanPlan2?: boolean
  studentLoanPlan4?: boolean
  studentLoanPlan5?: boolean
  postgraduateLoan?: boolean
  pensionOptedIn?: boolean
  deductionElections?: string[] | null
}): string[] {
  if (flags.deductionElections?.length) {
    return [...new Set(flags.deductionElections)]
  }
  const codes: string[] = []
  if (flags.studentLoanPlan1) codes.push('SL_PLAN_1')
  if (flags.studentLoanPlan2) codes.push('SL_PLAN_2')
  if (flags.studentLoanPlan4) codes.push('SL_PLAN_4')
  if (flags.studentLoanPlan5) codes.push('SL_PLAN_5')
  if (flags.postgraduateLoan) codes.push('POSTGRAD_LOAN')
  if (flags.pensionOptedIn) codes.push('PENSION_EMPLOYEE')
  return codes
}
