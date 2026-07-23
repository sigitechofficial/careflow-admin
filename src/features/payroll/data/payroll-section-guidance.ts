import type { UkPayrollItemKind } from '@/features/payroll/data/uk-payroll-2026-27.catalog'

/** Short purpose text for payroll setup section headings (shown via info icons). */
export const PAYROLL_SECTION_GUIDANCE = {
  paye: {
    title: 'PAYE (Income Tax)',
    purpose:
      'Pay As You Earn is HMRC’s system for collecting Income Tax from employment pay. It is not a separate tax — it is how Income Tax is deducted using the employee’s tax code (e.g. 1257L). Care calculates this on the payroll run from gross pay.',
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
