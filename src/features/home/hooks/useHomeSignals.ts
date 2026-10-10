import { useQuery } from '@tanstack/react-query'
import {
  fetchComplianceSummary,
  fetchLateMedicationCount,
  fetchMedicationExceptions,
  fetchOperationsOverview,
  fetchPolicyReviews,
  fetchServiceUserUpcoming,
  fetchStaffOff,
} from '@/features/home/api/home-signals.api'
import { fetchInitialAssessmentReviewQueue } from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import { fetchAssessmentReviewQueue } from '@/features/service-users/assessments/api'
import { serviceUserAssessmentKeys } from '@/features/service-users/assessments/keys'
import { fetchCarePlanReviewQueue } from '@/features/service-users/care-plans/api'
import { fetchBodyMapGovernanceAlerts, fetchBodyMapReviewQueue } from '@/features/service-users/body-map/api'
import { fetchSuspensionReviewsOverdue } from '@/features/service-users/visit-plan/api'
import { fetchVisitReconciliationExceptionQueue } from '@/features/billing/api/visit-reconciliations.api'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { getGlobalServiceUsersCalendarEvents } from '@/features/service-users/api/service-user-calendar.api'

/**
 * Data for the Home overview. Each hook takes `enabled` so a figure the user
 * cannot see never sends a request (and never 403s).
 */

const homeKeys = {
  all: ['home-signals'] as const,
  medication: (loc?: string | null, day?: string) => [...homeKeys.all, 'medication', loc ?? null, day] as const,
  lateMedication: (day: string) => [...homeKeys.all, 'late-medication', day] as const,
  upcoming: (loc?: string | null, days?: number) => [...homeKeys.all, 'su-upcoming', loc ?? null, days] as const,
  staffOff: (loc?: string | null, day?: string) => [...homeKeys.all, 'staff-off', loc ?? null, day] as const,
  policyReviews: (days: number) => [...homeKeys.all, 'policy-reviews', days] as const,
  compliance: (loc?: string | null) => [...homeKeys.all, 'compliance-summary', loc ?? null] as const,
  bodyMapQueue: (loc?: string | null) => [...homeKeys.all, 'body-map-queue', loc ?? null] as const,
  bodyMapAlerts: () => [...homeKeys.all, 'body-map-alerts'] as const,
  suspensionReviews: () => [...homeKeys.all, 'suspension-reviews'] as const,
  financeExceptions: () => [...homeKeys.all, 'finance-exceptions'] as const,
  appointments: (loc?: string | null, day?: string) => [...homeKeys.all, 'appointments', loc ?? null, day] as const,
  operations: (loc?: string | null) => [...homeKeys.all, 'operations', loc ?? null] as const,
}

const LIVE = { refetchInterval: 60_000, refetchOnWindowFocus: true, staleTime: 0 } as const

/** Missed / refused / not given / held doses today. Refreshes every minute. */
export function useMedicationExceptionsToday(locationId: string | null | undefined, enabled: boolean) {
  const today = operationalTodayIso()
  return useQuery({
    queryKey: homeKeys.medication(locationId, today),
    queryFn: ({ signal }) => fetchMedicationExceptions({ dateFrom: today, dateTo: today, locationId }, signal),
    enabled,
    ...LIVE,
  })
}

export function useLateMedicationToday(enabled: boolean) {
  const today = operationalTodayIso()
  return useQuery({
    queryKey: homeKeys.lateMedication(today),
    queryFn: ({ signal }) => fetchLateMedicationCount({ dateFrom: today, dateTo: today }, signal),
    enabled,
    ...LIVE,
  })
}

export function useServiceUserUpcoming(locationId: string | null | undefined, days: number, enabled: boolean) {
  return useQuery({
    queryKey: homeKeys.upcoming(locationId, days),
    queryFn: ({ signal }) => fetchServiceUserUpcoming({ days, locationId }, signal),
    enabled,
  })
}

export function useStaffOffToday(locationId: string | null | undefined, enabled: boolean) {
  const today = operationalTodayIso()
  return useQuery({
    queryKey: homeKeys.staffOff(locationId, today),
    queryFn: ({ signal }) => fetchStaffOff({ date: today, locationId }, signal),
    enabled,
  })
}

export function usePolicyReviews(days: number, enabled: boolean) {
  return useQuery({
    queryKey: homeKeys.policyReviews(days),
    queryFn: ({ signal }) => fetchPolicyReviews({ days }, signal),
    enabled,
  })
}

export function useComplianceSummary(locationId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: homeKeys.compliance(locationId),
    queryFn: ({ signal }) => fetchComplianceSummary({ locationId }, signal),
    enabled,
  })
}

export function useBodyMapReviewQueue(locationId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: homeKeys.bodyMapQueue(locationId),
    queryFn: ({ signal }) => fetchBodyMapReviewQueue({ locationId: locationId ?? undefined, signal }),
    enabled,
  })
}

export function useBodyMapGovernanceAlerts(enabled: boolean) {
  return useQuery({
    queryKey: homeKeys.bodyMapAlerts(),
    queryFn: ({ signal }) => fetchBodyMapGovernanceAlerts(signal),
    enabled,
  })
}

export function useSuspensionReviewsOverdue(enabled: boolean) {
  return useQuery({
    queryKey: homeKeys.suspensionReviews(),
    queryFn: () => fetchSuspensionReviewsOverdue(),
    enabled,
  })
}

export function useFinanceExceptionQueue(enabled: boolean) {
  return useQuery({
    queryKey: homeKeys.financeExceptions(),
    queryFn: () => fetchVisitReconciliationExceptionQueue(200),
    enabled,
  })
}

/* Review queues (same query keys as their own pages, so the cache is shared). */

export function useInitialAssessmentReviewQueue(locationId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: initialAssessmentKeys.reviewQueue(false, locationId ?? undefined),
    queryFn: () => fetchInitialAssessmentReviewQueue({ overdueActionsOnly: false, locationId: locationId ?? undefined }),
    enabled,
  })
}

export function useAssessmentReviewQueue(locationId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: serviceUserAssessmentKeys.reviewQueue(false, undefined, locationId ?? undefined),
    queryFn: () => fetchAssessmentReviewQueue({ overdueOnly: false, locationId: locationId ?? undefined }),
    enabled,
  })
}

export function useCarePlanReviewQueue(locationId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['care-plan-reviews', 'all', locationId ?? undefined],
    queryFn: () => fetchCarePlanReviewQueue({ status: 'all', locationId: locationId ?? undefined }),
    enabled,
  })
}


export type AppointmentToday = { id: string; serviceUserId: string; serviceUserName: string; type: string; title: string; start: string; allDay: boolean }

/** Scheduled service-user appointments today (GP, hospital, reviews…) from the organisation calendar. */
export function useAppointmentsToday(locationId: string | null | undefined, enabled: boolean) {
  const today = operationalTodayIso()
  return useQuery({
    queryKey: homeKeys.appointments(locationId, today),
    queryFn: async () => {
      const res = await getGlobalServiceUsersCalendarEvents({
        dateFrom: today,
        dateTo: today,
        status: 'SCHEDULED',
        locationId: locationId ?? undefined,
      })
      const meta = res.meta as { total?: number } | undefined
      const items: AppointmentToday[] = res.data.map((e) => {
        const su = (e as { serviceUser?: { firstName?: string | null; lastName?: string | null; preferredName?: string | null } }).serviceUser
        const first = su?.preferredName?.trim() || su?.firstName?.trim() || ''
        return {
          id: e.id,
          serviceUserId: e.serviceUserId,
          serviceUserName: [first, su?.lastName?.trim() ?? ''].filter(Boolean).join(' ') || 'Service user',
          type: e.eventType?.name ?? 'Appointment',
          title: e.title,
          start: e.startDateTime,
          allDay: e.allDay,
        }
      })
      return { total: meta?.total ?? items.length, items }
    },
    enabled,
  })
}

export type { OperationsOverview, UpcomingCategory } from '@/features/home/api/home-signals.api'

/** Care Operations dashboard counts: alert backlog, unfilled visits, cancellations, continuity. Refreshes every minute. */
export function useOperationsOverview(locationId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: homeKeys.operations(locationId),
    queryFn: ({ signal }) => fetchOperationsOverview({ locationId }, signal),
    enabled,
    ...LIVE,
  })
}
