export const payrollKeys = {
  all: ['payroll'] as const,
  overview: () => [...payrollKeys.all, 'overview'] as const,
  employerSettings: () => [...payrollKeys.all, 'employer-settings'] as const,
  taxYears: () => [...payrollKeys.all, 'tax-years'] as const,
  taxCodes: (params?: { includeInactive?: boolean }) =>
    [...payrollKeys.all, 'tax-codes', params ?? {}] as const,
  statutoryRates: (params?: { taxYearId?: string }) =>
    [...payrollKeys.all, 'statutory-rates', params ?? {}] as const,
  schedules: () => [...payrollKeys.all, 'schedules'] as const,
  periods: (params?: { scheduleId?: string; taxYearId?: string }) =>
    [...payrollKeys.all, 'periods', params ?? {}] as const,
  employees: () => [...payrollKeys.all, 'employees'] as const,
  profile: (employeeId: string) => [...payrollKeys.all, 'profile', employeeId] as const,
  agreements: (employeeId: string) => [...payrollKeys.all, 'agreements', employeeId] as const,
  runs: () => [...payrollKeys.all, 'runs'] as const,
  run: (id: string) => [...payrollKeys.all, 'run', id] as const,
  runFps: (id: string) => [...payrollKeys.all, 'run', id, 'fps'] as const,
  runHmrcSubmissions: (id: string) =>
    [...payrollKeys.all, 'run', id, 'hmrc-submissions'] as const,
  epsPreview: (params: Record<string, unknown>) =>
    [...payrollKeys.all, 'eps-preview', params] as const,
}
