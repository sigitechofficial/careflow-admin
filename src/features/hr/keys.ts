export const hrKeys = {
  all: ['hr'] as const,
  employees: (params?: Record<string, unknown>) => [...hrKeys.all, 'employees', params ?? {}] as const,
  profile: (employeeId: string) => [...hrKeys.all, 'profile', employeeId] as const,
  documents: (employeeId: string) => [...hrKeys.all, 'documents', employeeId] as const,
}
