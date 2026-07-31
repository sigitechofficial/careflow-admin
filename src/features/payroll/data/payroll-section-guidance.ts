import type { UkPayrollItemKind } from '@/features/payroll/data/uk-payroll-2026-27.catalog'

/** Short purpose text for payroll setup section headings (shown via info icons). */
export const PAYROLL_SECTION_GUIDANCE = {
  runs: {
    title: 'UK payroll runs',
    purpose:
      'A UK payroll run is the working shell for one pay period: enrol ready employees, calculate gross from visit pay / salary, then calculate Week 1 / Month 1 tax & NI. Close when finished; reactivate a closed or cancelled run to continue edits.',
  },
  schedules: {
    title: 'Pay schedules',
    purpose:
      'A pay schedule defines how often staff are paid (weekly, fortnightly, four-weekly, or monthly) and the anchor day used when generating payment dates. Schedules are calendar scaffolding only — they do not calculate tax or NI.',
  },
  activeSchedules: {
    title: 'Active schedules',
    purpose:
      'Count of schedules currently marked ACTIVE and available for generating periods and opening UK payroll runs. Suspended or draft schedules are excluded.',
  },
  taxYears: {
    title: 'Tax years',
    purpose:
      'UK tax years run 6 April to 5 April. Periods and statutory rates are scoped to a tax year. Ensure the current year exists before generating periods.',
  },
  openPeriods: {
    title: 'Open periods',
    purpose:
      'Periods in OPEN or IN_RUN status for the filters above. These are the windows you can still create or continue a UK payroll run against.',
  },
  periods: {
    title: 'Pay periods',
    purpose:
      'Periods are the dated windows inside a UK tax year for a chosen schedule (e.g. monthly 6th→5th). Generate them after the schedule and tax year exist, then open a UK payroll run against a period. Statutory PAYE / NI is calculated on the run, not here.',
  },
  anchorDay: {
    title: 'Anchor day',
    purpose:
      'For monthly schedules, the day of the month used for payment date (1–31; shorter months use the last day). For weekly-style schedules, the day offset within each pay cycle. It shapes payment dates when periods are generated.',
  },
  paye: {
    title: 'PAYE (Income Tax)',
    purpose:
      'Pay As You Earn is HMRC’s system for collecting Income Tax from employment pay. It is not a separate tax — it is how Income Tax is deducted using the employee’s tax code (e.g. 1257L). Care calculates this on the payroll run from gross pay.',
  },
  starterDeclaration: {
    title: 'Starter declaration',
    purpose:
      'HMRC new-starter statement (when there is no P45). A = first job since 6 April; B = only job this tax year; C = another job or pension. Stored on the profile for setup / future FPS — it does not change Week 1 / Month 1 tax or NI on the run today (tax still uses the tax code).',
  },
  employeeNi: {
    title: 'Employee National Insurance',
    purpose:
      'Employee (primary) Class 1 National Insurance is deducted from the carer’s pay each period. Set their NI number (identity) and NI category letter (usually A). The £ amount is calculated on the payroll run — not typed here.',
  },
  catalogue: {
    title: 'UK taxes & deductions catalogue',
    purpose:
      'Complete UK 2026/27 list of payroll taxes, statutory deductions, voluntary deductions, benefits in kind, and employer liabilities. Tick items that apply to this employee. Only PAYE and employee Class 1 NI are calculated as money today; other ticks are stored for later engines.',
  },
  employeeTaxes: {
    title: 'Employee taxes',
    purpose:
      'Taxes that can come out of (or affect) the employee’s pay: PAYE Income Tax, employee Class 1 NI, and related items such as tax on benefits, tips, or termination pay. PAYE and employee NI are calculated on the run; other items are listed for completeness until engines are added.',
  },
  statutory: {
    title: 'Government & statutory deductions',
    purpose:
      'Legal payroll deductions that are not taxes — student loans, postgraduate loan, workplace pension contributions, child maintenance, and court/government attachment orders (England, Wales, Scotland, Northern Ireland). Tick what applies; amounts are configured for future calculation, not entered as free-text tax.',
  },
  voluntary: {
    title: 'Voluntary / contractual deductions',
    purpose:
      'Deductions agreed with the employee or allowed by contract — extra pension, salary sacrifice, Cycle to Work, union subs, Payroll Giving, loan repayments, and similar. An employer normally needs a legal requirement, contract clause, or written agreement before deducting these.',
  },
  benefitsInKind: {
    title: 'Taxable benefits in kind',
    purpose:
      'Benefits that can increase taxable pay (company car, private medical, accommodation, loans, etc.). They usually change Income Tax / employer Class 1A NI rather than appearing as a separate “tax type”. Catalogued now; calculation is on the roadmap.',
  },
  employerLiabilities: {
    title: 'Employer-side liabilities',
    purpose:
      'Costs the employer pays to HMRC or a pension scheme — employer Class 1 NI, Class 1A/1B, Apprenticeship Levy, employer pension, PSA. These must not normally be deducted from the employee’s net salary. Employer Class 1 NI is already shown on the run.',
  },
} as const

export const PAYROLL_KIND_GUIDANCE: Record<UkPayrollItemKind, string> = {
  EMPLOYEE_TAX: PAYROLL_SECTION_GUIDANCE.employeeTaxes.purpose,
  STATUTORY_DEDUCTION: PAYROLL_SECTION_GUIDANCE.statutory.purpose,
  VOLUNTARY_DEDUCTION: PAYROLL_SECTION_GUIDANCE.voluntary.purpose,
  BENEFIT_IN_KIND: PAYROLL_SECTION_GUIDANCE.benefitsInKind.purpose,
  EMPLOYER_LIABILITY: PAYROLL_SECTION_GUIDANCE.employerLiabilities.purpose,
}
