import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { incidentKeys } from '@/features/incidents/keys'
import {
  addIncidentClarification,
  changeIncidentSeverity,
  correctIncident,
  startIncidentReview,
  changeIncidentStatus,
  completeIncidentAction,
  createIncident,
  createIncidentAction,
  fetchIncident,
  fetchIncidentActions,
  fetchIncidentAnalytics,
  fetchIncidentVisitOptions,
  fetchIncidentCategories,
  fetchIncidentStats,
  fetchIncidents,
  fetchMyIncidentActions,
  updateIncidentAction,
  upsertIncidentInvestigation,
  upsertIncidentOutcome,
  upsertIncidentReview,
  suspendIncidentCarer,
  removeIncidentCarerSuspension,
  recommendIncidentCarerCourse,
  removeIncidentCarerCourseRecommendation,
} from '@/features/incidents/api/incidents.api'
import type {
  CorrectIncidentInput,
  CreateIncidentActionInput,
  CreateIncidentInput,
  IncidentClarificationField,
  IncidentAnalyticsFilters,
  IncidentListFilters,
  IncidentSeverity,
  IncidentStatus,
  UpdateIncidentActionInput,
  UpsertIncidentInvestigationInput,
  UpsertIncidentOutcomeInput,
  UpsertIncidentReviewInput,
} from '@/features/incidents/types'

/** Visits a new incident can be linked to (date ± 1 day). Disabled until a date and a person are known. */
export function useIncidentVisitOptions(params: { date: string; serviceUserId?: string; employeeId?: string }) {
  return useQuery({
    queryKey: incidentKeys.visitOptions(params),
    queryFn: ({ signal }) => fetchIncidentVisitOptions(params, { signal }),
    enabled: Boolean(params.date && (params.serviceUserId || params.employeeId)),
    staleTime: 60 * 1000,
  })
}

export function useIncidentCategories() {
  return useQuery({
    queryKey: incidentKeys.categories(),
    queryFn: ({ signal }) => fetchIncidentCategories({ signal }),
    staleTime: 5 * 60 * 1000,
  })
}

export function useIncidents(filters: IncidentListFilters) {
  return useQuery({
    queryKey: incidentKeys.list(filters),
    queryFn: ({ signal }) => fetchIncidents(filters, { signal }),
  })
}

export function useIncident(id: string | undefined) {
  return useQuery({
    queryKey: incidentKeys.detail(id ?? ''),
    queryFn: ({ signal }) => fetchIncident(id!, { signal }),
    enabled: Boolean(id),
  })
}

export function useIncidentStats(locationId?: string | null, enabled = true) {
  return useQuery({
    queryKey: incidentKeys.stats(locationId),
    queryFn: ({ signal }) => fetchIncidentStats(locationId ?? undefined, { signal }),
    enabled,
  })
}

export function useIncidentAnalytics(filters: IncidentAnalyticsFilters) {
  return useQuery({
    queryKey: incidentKeys.analytics(filters),
    queryFn: ({ signal }) => fetchIncidentAnalytics(filters, { signal }),
  })
}

export function useUpsertIncidentReview(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertIncidentReviewInput) => upsertIncidentReview(id, input),
    onSuccess: () => {
      toastSuccess('Manager review saved')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useUpsertIncidentInvestigation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertIncidentInvestigationInput) => upsertIncidentInvestigation(id, input),
    onSuccess: () => {
      toastSuccess('Investigation saved')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useSuspendIncidentCarer(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      employeeId?: string
      reason: string
      suspendFrom: string
      suspendTo: string
    }) => suspendIncidentCarer(id, input),
    onSuccess: () => {
      toastSuccess('Carer suspended')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useRemoveIncidentCarerSuspension(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (suspensionId: string) => removeIncidentCarerSuspension(id, suspensionId),
    onSuccess: () => {
      toastSuccess('Carer suspension removed')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useRecommendIncidentCarerCourse(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      employeeId?: string
      courseId: string
      dueAt?: string
      reason?: string
      isMandatory?: boolean
    }) => recommendIncidentCarerCourse(id, input),
    onSuccess: () => {
      toastSuccess('Course recommended')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useRemoveIncidentCarerCourseRecommendation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recommendationId: string) =>
      removeIncidentCarerCourseRecommendation(id, recommendationId),
    onSuccess: () => {
      toastSuccess('Course recommendation removed')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useUpsertIncidentOutcome(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertIncidentOutcomeInput) => upsertIncidentOutcome(id, input),
    onSuccess: () => {
      toastSuccess('Outcome saved')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useIncidentActions(id: string | undefined) {
  return useQuery({
    queryKey: incidentKeys.actions(id ?? ''),
    queryFn: ({ signal }) => fetchIncidentActions(id!, { signal }),
    enabled: Boolean(id),
  })
}

export function useMyIncidentActions() {
  return useQuery({
    queryKey: incidentKeys.myActions(),
    queryFn: ({ signal }) => fetchMyIncidentActions({ signal }),
  })
}

export function useCreateIncidentAction(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateIncidentActionInput) => createIncidentAction(id, input),
    onSuccess: () => {
      toastSuccess('Corrective measure created')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useUpdateIncidentAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { actionId: string; input: UpdateIncidentActionInput }) =>
      updateIncidentAction(vars.actionId, vars.input),
    onSuccess: () => {
      toastSuccess('Corrective measure updated')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useCompleteIncidentAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { actionId: string; completionNotes?: string }) =>
      completeIncidentAction(vars.actionId, vars.completionNotes),
    onSuccess: () => {
      toastSuccess('Corrective measure completed')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useCreateIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateIncidentInput) => createIncident(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useChangeIncidentStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { status: IncidentStatus; reason?: string; overrideMandatoryActions?: boolean }) =>
      changeIncidentStatus(id, vars.status, vars.reason, vars.overrideMandatoryActions),
    onSuccess: () => {
      toastSuccess('Incident status updated')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useStartIncidentReview(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => startIncidentReview(id),
    onSuccess: () => {
      toastSuccess('Review started')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useCorrectIncident(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CorrectIncidentInput) => correctIncident(id, input),
    onSuccess: () => {
      toastSuccess('Details corrected')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useAddIncidentClarification(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { field: IncidentClarificationField; note: string }) =>
      addIncidentClarification(id, input),
    onSuccess: () => {
      toastSuccess('Clarification added')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useChangeIncidentSeverity(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { severity: IncidentSeverity; reason?: string }) =>
      changeIncidentSeverity(id, vars.severity, vars.reason),
    onSuccess: () => {
      toastSuccess('Incident severity updated')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}
