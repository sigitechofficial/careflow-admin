import { useCallback } from 'react'
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
  removeIncidentAction,
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
  fetchIncidentInvestigators,
  pauseIncidentInvestigation,
  resumeIncidentInvestigation,
  upsertIncidentOutcome,
  upsertIncidentReview,
  suspendIncidentCarer,
  addIncidentExternalBody,
  updateIncidentExternalBody,
  deleteIncidentExternalBody,
  liftIncidentCarerSuspension,
  extendIncidentCarerSuspension,
  continueIncidentCarerSuspension,
  createIncidentStaffAction,
  saveCandourStep,
  type CandourStep,
  fetchCarePlanMeasureEvidence,
  updateIncidentStaffAction,
  removeIncidentStaffAction,
  fetchEmployeeIncidentSuspensions,
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
  IncidentExternalBodyInput,
  IncidentStaffActionInput,
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

/**
 * Every incident matching the filters (all pages), for CSV export. Same API and access rules as the
 * All Incidents list, so restricted incidents only come back for people allowed to see them.
 */
export function useFetchAllIncidents() {
  return useCallback(async (filters: Omit<IncidentListFilters, 'page' | 'limit'>) => {
    const limit = 100
    const first = await fetchIncidents({ ...filters, page: 1, limit })
    const items = [...first.items]
    for (let page = 2; page <= first.totalPages; page++) {
      items.push(...(await fetchIncidents({ ...filters, page, limit })).items)
    }
    return items
  }, [])
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

/** Shared so the Next step bar can show progress while "Complete investigation" saves. */
export const upsertIncidentInvestigationMutationKey = (id: string) =>
  ['incidents', id, 'investigation', 'upsert'] as const

export function useUpsertIncidentInvestigation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: upsertIncidentInvestigationMutationKey(id),
    mutationFn: (input: UpsertIncidentInvestigationInput) => upsertIncidentInvestigation(id, input),
    onSuccess: () => {
      toastSuccess('Investigation saved')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

/** Eligible lead investigators (only fetched while the set-up can be edited). */
export function useIncidentInvestigators(id: string, enabled: boolean) {
  return useQuery({
    queryKey: incidentKeys.investigators(id),
    queryFn: ({ signal }) => fetchIncidentInvestigators(id, { signal }),
    enabled,
    staleTime: 60 * 1000,
  })
}

export function usePauseIncidentInvestigation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { reason: string; nextReviewDate: string }) =>
      pauseIncidentInvestigation(id, input),
    onSuccess: () => {
      toastSuccess('Investigation paused')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useResumeIncidentInvestigation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => resumeIncidentInvestigation(id),
    onSuccess: () => {
      toastSuccess('Investigation resumed')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useAddIncidentExternalBody(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IncidentExternalBodyInput) => addIncidentExternalBody(id, input),
    onSuccess: () => {
      toastSuccess('External body added')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useUpdateIncidentExternalBody(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { bodyId: string; input: Partial<IncidentExternalBodyInput> }) =>
      updateIncidentExternalBody(id, vars.bodyId, vars.input),
    onSuccess: () => {
      toastSuccess('External body updated')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useDeleteIncidentExternalBody(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { bodyId: string; reason: string }) =>
      deleteIncidentExternalBody(id, vars.bodyId, vars.reason),
    onSuccess: () => {
      toastSuccess('External body removed')
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
    onSuccess: (data) => {
      toastSuccess(data.status === 'SCHEDULED' ? 'Suspension scheduled' : 'Carer suspended')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useLiftIncidentCarerSuspension(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { suspensionId: string; reason: string }) =>
      liftIncidentCarerSuspension(id, input.suspensionId, input.reason),
    onSuccess: () => {
      toastSuccess('Suspension lifted')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useContinueIncidentCarerSuspension(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { suspensionId: string; suspendTo: string; reason: string }) =>
      continueIncidentCarerSuspension(id, input.suspensionId, {
        suspendTo: input.suspendTo,
        reason: input.reason,
      }),
    onSuccess: () => {
      toastSuccess('Suspension continues beyond the incident')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useCreateIncidentStaffAction(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IncidentStaffActionInput & { employeeId: string }) =>
      createIncidentStaffAction(id, input),
    onSuccess: () => {
      toastSuccess('Staff action recorded')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useUpdateIncidentStaffAction(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IncidentStaffActionInput & { staffActionId: string; changeReason: string }) => {
      const { staffActionId, ...body } = input
      return updateIncidentStaffAction(id, staffActionId, body)
    },
    onSuccess: () => {
      toastSuccess('Staff action updated')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

export function useRemoveIncidentStaffAction(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { staffActionId: string; reason: string }) =>
      removeIncidentStaffAction(id, input.staffActionId, input.reason),
    onSuccess: () => {
      toastSuccess('Staff action removed')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

/** A carer's suspension history across incidents (employee record). */
export function useEmployeeIncidentSuspensions(employeeId: string | undefined) {
  return useQuery({
    queryKey: incidentKeys.employeeSuspensions(employeeId ?? ''),
    queryFn: ({ signal }) => fetchEmployeeIncidentSuspensions(employeeId!, { signal }),
    enabled: Boolean(employeeId),
  })
}

export function useExtendIncidentCarerSuspension(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { suspensionId: string; suspendTo: string; reason: string }) =>
      extendIncidentCarerSuspension(id, input.suspensionId, {
        suspendTo: input.suspendTo,
        reason: input.reason,
      }),
    onSuccess: () => {
      toastSuccess('Suspension extended')
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
    mutationFn: (vars: {
      actionId: string
      completionNotes: string
      completedRecords?: { id: string; label: string }[]
      carePlanVersionId?: string
    }) =>
      completeIncidentAction(
        vars.actionId,
        vars.completionNotes,
        vars.completedRecords,
        vars.carePlanVersionId,
      ),
    onSuccess: () => {
      toastSuccess('Corrective measure completed')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

/** Duty of Candour: save one step for one service user. */
export function useSaveCandourStep(incidentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { serviceUserId: string; step: CandourStep; body: Record<string, unknown> }) =>
      saveCandourStep(incidentId, vars.serviceUserId, vars.step, vars.body),
    onSuccess: () => {
      toastSuccess('Duty of Candour saved')
      void qc.invalidateQueries({ queryKey: incidentKeys.all() })
    },
    onError: (e) => toastApiError(e),
  })
}

/** Care plan update measure: plans to open and published versions that can complete it. */
export function useCarePlanMeasureEvidence(actionId: string, enabled = true) {
  return useQuery({
    queryKey: incidentKeys.carePlanEvidence(actionId),
    queryFn: ({ signal }) => fetchCarePlanMeasureEvidence(actionId, { signal }),
    enabled: enabled && Boolean(actionId),
    staleTime: 15_000,
  })
}

export function useRemoveIncidentAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { actionId: string; reason: string }) =>
      removeIncidentAction(vars.actionId, vars.reason),
    onSuccess: () => {
      toastSuccess('Corrective measure removed')
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
    mutationFn: (vars: {
      status: IncidentStatus
      reason?: string
      overrideMandatoryActions?: boolean
      overrideOpenExternalBodies?: boolean
      overrideIncompleteCandour?: boolean
    }) =>
      changeIncidentStatus(
        id,
        vars.status,
        vars.reason,
        vars.overrideMandatoryActions,
        vars.overrideOpenExternalBodies,
        vars.overrideIncompleteCandour,
      ),
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
