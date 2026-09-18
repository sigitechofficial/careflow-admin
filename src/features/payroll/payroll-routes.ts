export const PAYROLL_PATHS = {
  overview: '/payroll',
  employer: '/payroll/employer',
  taxYears: '/payroll/tax-years',
  taxes: '/payroll/taxes',
  schedules: '/payroll/schedules',
  employees: '/payroll/employees',
  runs: '/payroll/runs',
  runDetail: (runId: string) => `/payroll/runs/${runId}`,
  payslips: '/payroll/payslips',
} as const
