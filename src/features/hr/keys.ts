export const hrKeys = {
  all: ['hr'] as const,
  employees: (params?: Record<string, unknown>) => [...hrKeys.all, 'employees', params ?? {}] as const,
  summary: () => [...hrKeys.all, 'summary'] as const,
  profile: (employeeId: string) => [...hrKeys.all, 'profile', employeeId] as const,
  documents: (employeeId: string) => [...hrKeys.all, 'documents', employeeId] as const,
  expiringDocuments: () => [...hrKeys.all, 'documents', 'expiring'] as const,
}
