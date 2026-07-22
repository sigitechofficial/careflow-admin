export const PAYROLL_PATHS = {
  overview: '/payroll',
  taxYears: '/payroll/tax-years',
  schedules: '/payroll/schedules',
  employees: '/payroll/employees',
  runs: '/payroll/runs',
  runDetail: (runId: string) => `/payroll/runs/${runId}`,
} as const
