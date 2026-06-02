import type { ListEmployeesParams } from '@/features/employees/api'

/**
 * Typed query key factory for all employee queries.
 *
 * Same hierarchy pattern as serviceUserKeys â€” broader keys invalidate everything below.
 */
export const employeeKeys = {
  /** Invalidates every employee query. */
  all: () => ['employees'] as const,

  /** Invalidates all employee list queries. */
  lists: () => [...employeeKeys.all(), 'list'] as const,

  /** Specific paginated/filtered list. */
  list: (params: ListEmployeesParams) =>
    [...employeeKeys.lists(), params] as const,

  /** Lookups bundle (titles, statuses, roles, etc.). */
  lookups: () => [...employeeKeys.all(), 'lookups'] as const,

  /** Chart summary (staff-count by status for dashboard). */
  chartSummary: () => [...employeeKeys.all(), 'chart-summary'] as const,

  /** Invalidates all queries for a single employee. */
  detail: (id: string) => [...employeeKeys.all(), 'detail', id] as const,

  /** Core profile data for one employee. */
  profile: (id: string) =>
    [...employeeKeys.detail(id), 'profile'] as const,

  /** All-staff documents registry. */
  documentsRegistry: () => [...employeeKeys.all(), 'documents-registry'] as const,

  /** Skills list for one employee. */
  skills: (id: string) => [...employeeKeys.detail(id), 'skills'] as const,

  /** Organisation-wide skills overview. */
  skillsOverview: () => [...employeeKeys.all(), 'skills-overview'] as const,

  /** Non-core activities for one employee. */
  nonCoreActivities: (id: string) =>
    [...employeeKeys.detail(id), 'non-core-activities'] as const,

  /** Organisation-wide non-core activity registry. */
  nonCoreRegistry: () => [...employeeKeys.all(), 'non-core-registry'] as const,

  /** Full employee list (all pages). */
  allList: (params: Omit<ListEmployeesParams, 'page' | 'limit'>) =>
    [...employeeKeys.lists(), 'all', params] as const,

  /** Per-employee uploaded documents. */
  documents: (id: string) => [...employeeKeys.detail(id), 'documents'] as const,

  /** Emergency contacts for one employee. */
  emergencyContacts: (id: string) => [...employeeKeys.detail(id), 'emergency-contacts'] as const,

  /** Weekly working patterns for one employee. */
  workingPatterns: (id: string) => [...employeeKeys.detail(id), 'working-patterns'] as const,

  /** Compliance checklist for one employee. */
  complianceChecklist: (id: string, ensure: boolean) =>
    [...employeeKeys.detail(id), 'compliance-checklist', { ensure }] as const,
} as const
