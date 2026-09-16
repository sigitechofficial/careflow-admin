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
  employees: (locationId?: string | null) =>
    [...payrollKeys.all, 'employees', locationId ?? 'all'] as const,
  profile: (employeeId: string) => [...payrollKeys.all, 'profile', employeeId] as const,
  agreements: (employeeId: string) => [...payrollKeys.all, 'agreements', employeeId] as const,
  runs: (locationId?: string | null) =>
    [...payrollKeys.all, 'runs', locationId ?? 'all'] as const,
  run: (id: string, locationId?: string | null) =>
    [...payrollKeys.all, 'run', id, locationId ?? 'all'] as const,
  runFps: (id: string) => [...payrollKeys.all, 'run', id, 'fps'] as const,
  runHmrcSubmissions: (id: string) =>
    [...payrollKeys.all, 'run', id, 'hmrc-submissions'] as const,
  epsPreview: (params: Record<string, unknown>) =>
    [...payrollKeys.all, 'eps-preview', params] as const,
  epsSubmissions: (params: Record<string, unknown>) =>
    [...payrollKeys.all, 'eps-submissions', params] as const,
}
