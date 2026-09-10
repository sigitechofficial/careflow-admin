import type { ListServiceUsersParams } from '@/features/service-users/api'

/**
 * Typed query key factory for all service-user queries.
 *
 * Rules:
 * - Keys form a hierarchy: broader keys invalidate everything below them.
 * - `all` invalidates every service-user query (e.g. after a bulk action).
 * - `lists` invalidates all list queries (e.g. after creating/deleting a SU).
 * - `list(params)` is the specific paginated+filtered list key.
 * - `detail(id)` invalidates all detail sub-queries for one service user.
 * - Granular sub-keys (documents, allergies, etc.) allow targeted invalidation.
 *
 * Usage:
 *   queryClient.invalidateQueries({ queryKey: serviceUserKeys.lists() })
 *   queryClient.invalidateQueries({ queryKey: serviceUserKeys.detail(id) })
 */
export const serviceUserKeys = {
  /** Invalidates every service-user query. */
  all: () => ['service-users'] as const,

  /** Invalidates all list queries. */
  lists: () => [...serviceUserKeys.all(), 'list'] as const,

  /** Specific paginated/filtered list. */
  list: (params: ListServiceUsersParams) =>
    [...serviceUserKeys.lists(), params] as const,

  /** Lookups bundle (statuses, titles, genders, risk levels, etc.). */
  lookups: () => [...serviceUserKeys.all(), 'lookups'] as const,

  /** Invalidates all queries for a single service user. */
  detail: (id: string) => [...serviceUserKeys.all(), 'detail', id] as const,

  /** Core profile data for one service user. */
  profile: (id: string) =>
    [...serviceUserKeys.detail(id), 'profile'] as const,

  /** Documents bundle. */
  documents: (id: string) =>
    [...serviceUserKeys.detail(id), 'documents'] as const,

  /** Document store (1G) with compliance dashboard. */
  documentStore: (id: string) =>
    [...serviceUserKeys.detail(id), 'document-store'] as const,

  /** Allergies list. */
  allergies: (id: string) =>
    [...serviceUserKeys.detail(id), 'allergies'] as const,
  medicationAllergies: (id: string) =>
    [...serviceUserKeys.detail(id), 'medication-allergies'] as const,

  /** Personal inventory. */
  inventory: (id: string) =>
    [...serviceUserKeys.detail(id), 'inventory'] as const,

  /** Medications list (`scope`: default active-only vs `all` includes ended/cancelled). */
  medications: (id: string, scope: 'active' | 'all' = 'active') =>
    [...serviceUserKeys.detail(id), 'medications', scope] as const,

  /** Observations + observation types. */
  observations: (id: string) =>
    [...serviceUserKeys.detail(id), 'observations'] as const,

  /** Initial assessment. */
  initialAssessment: (id: string) =>
    [...serviceUserKeys.detail(id), 'initial-assessment'] as const,

  /** Flash message. */
  flashMessage: (id: string) =>
    [...serviceUserKeys.detail(id), 'flash-message'] as const,

  /** Dom care profile. */
  domCare: (id: string) =>
    [...serviceUserKeys.detail(id), 'dom-care'] as const,

  /** Visit plans (authorised care package). */
  visitPlans: (id: string) =>
    [...serviceUserKeys.detail(id), 'visit-plans'] as const,

  visitPlanActive: (id: string) =>
    [...serviceUserKeys.visitPlans(id), 'active'] as const,

  visitPlanWorking: (id: string) =>
    [...serviceUserKeys.visitPlans(id), 'working'] as const,

  /** Completed / partial visit activity for one service user. */
  visitActivity: (
    id: string,
    params?: { page?: number; limit?: number; dateFrom?: string; dateTo?: string },
  ) => [...serviceUserKeys.detail(id), 'visit-activity', params ?? {}] as const,

  /** Live-in profile. */
  liveIn: (id: string) =>
    [...serviceUserKeys.detail(id), 'live-in'] as const,

  /** Live-in lookups (global). */
  liveInLookups: () => [...serviceUserKeys.all(), 'live-in-lookups'] as const,

  /** Enterprise funding rows for one service user. */
  funding: (id: string) =>
    [...serviceUserKeys.detail(id), 'funding'] as const,

  /** Enterprise funding type catalog. */
  fundingTypes: () => [...serviceUserKeys.all(), 'funding-types'] as const,

  /** Enterprise funder catalog. */
  funders: () => [...serviceUserKeys.all(), 'funders'] as const,

  /** Absences list. */
  absences: (id: string) =>
    [...serviceUserKeys.detail(id), 'absences'] as const,

  /** Care plan + forms. */
  carePlan: (id: string) =>
    [...serviceUserKeys.detail(id), 'care-plan'] as const,

  /** Organisation weekly package / assigned / worked hours overview. */
  hoursWeekly: (params?: Record<string, string | boolean | undefined>) =>
    [...serviceUserKeys.all(), 'hours-weekly', params ?? {}] as const,

  /** Per–service-user monthly hours detail (week-by-week). */
  hoursMonthlyDetail: (params?: Record<string, string | undefined>) =>
    [...serviceUserKeys.all(), 'hours-monthly-detail', params ?? {}] as const,
} as const
