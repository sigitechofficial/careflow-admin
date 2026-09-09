import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acknowledgeEcmException,
  allowVisitContinue,
  authoriseCheckInMethodGrant,
  rejectCheckInMethodGrant,
  amendEcmAttendance,
  applyMissedTriage,
  closeEcmException,
  createEcmNotification,
  fetchEcmAuditTrail,
  fetchEcmComplianceReport,
  fetchEcmDailyOpsReport,
  fetchEcmExceptions,
  fetchEcmGraphDashboard,
  fetchEcmHealth,
  fetchEcmLiveDashboard,
  fetchEcmNotifications,
  fetchEcmReasonCodes,
  fetchEcmVisitDetail,
  fetchEcmThresholdLookups,
  recordManualAttendance,
  reevaluateEcmVisit,
  resolveEcmException,
  updateEcmThresholdLookup,
} from '@/features/ecm/api/ecm.api'
import { ecmKeys } from '@/features/ecm/keys'

export function useEcmLiveDashboard(filters?: {
  date?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  scheduleAreaId?: string
  locationId?: string
  serviceUserId?: string
  enabled?: boolean
}) {
  const { enabled = true, ...params } = filters ?? {}
  return useQuery({
    queryKey: ecmKeys.liveDashboard(params),
    // Let the API size the page from dateFrom–dateTo (period filters must cover the range).
    queryFn: () => fetchEcmLiveDashboard(params),
    enabled,
    refetchInterval: 60_000,
    // Override app defaults (30s stale / no focus refetch) so return from
    // schedule-board completion immediately shows cleared exceptions / tiles.
    refetchOnWindowFocus: true,
    staleTime: 0,
  })
}

/** Invalidate all ECM queries (live tiles, exceptions, visit detail, etc.). */
export function useInvalidateEcmQueries() {
  const qc = useQueryClient()
  return useCallback(() => {
    // refetchType 'active' ensures mounted live dashboard + exception queue refetch now
    // (not only mark stale), so return-from-complete / Refresh always show new status.
    void qc.invalidateQueries({ queryKey: ecmKeys.all, refetchType: 'active' })
  }, [qc])
}

export function useEcmVisitDetail(jobId: string | null | undefined) {
  return useQuery({
    queryKey: ecmKeys.visitDetail(jobId ?? ''),
    queryFn: () => fetchEcmVisitDetail(jobId!),
    enabled: Boolean(jobId),
  })
}

export function useReevaluateEcmVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) => reevaluateEcmVisit(jobId),
    onSuccess: (_data, jobId) => {
      void qc.invalidateQueries({ queryKey: ecmKeys.visitDetail(jobId) })
      void qc.invalidateQueries({ queryKey: ecmKeys.all })
    },
  })
}

export function useEcmExceptions(
  options?: { limit?: number; serviceUserId?: string; locationId?: string; enabled?: boolean },
) {
  const { limit = 50, serviceUserId, locationId, enabled = true } = options ?? {}
  return useQuery({
    queryKey: ecmKeys.exceptions({ limit, serviceUserId, locationId }),
    queryFn: () => fetchEcmExceptions({ limit, serviceUserId, locationId }),
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  })
}

export function useEcmReasonCodes(enabled = true) {
  return useQuery({
    queryKey: ecmKeys.reasonCodes(),
    queryFn: fetchEcmReasonCodes,
    enabled,
    staleTime: 60 * 60_000,
  })
}

export function useEcmHealth(enabled = true) {
  return useQuery({
    queryKey: ecmKeys.health(),
    queryFn: fetchEcmHealth,
    enabled,
    refetchInterval: 60_000,
  })
}

export function useEcmDailyOpsReport(
  dateOrRange?: string | { dateFrom?: string; dateTo?: string },
  enabled = true,
  params?: { scheduleAreaId?: string; locationId?: string },
) {
  const rangeKey =
    typeof dateOrRange === 'string'
      ? dateOrRange
      : `${dateOrRange?.dateFrom ?? ''}:${dateOrRange?.dateTo ?? ''}`
  return useQuery({
    queryKey: ecmKeys.dailyOps(rangeKey, params?.scheduleAreaId, params?.locationId),
    queryFn: () => fetchEcmDailyOpsReport(dateOrRange, params),
    enabled,
  })
}

export function useEcmComplianceReport(
  dateOrRange?: string | { dateFrom?: string; dateTo?: string },
  enabled = true,
  params?: { scheduleAreaId?: string; locationId?: string },
) {
  const rangeKey =
    typeof dateOrRange === 'string'
      ? dateOrRange
      : `${dateOrRange?.dateFrom ?? ''}:${dateOrRange?.dateTo ?? ''}`
  return useQuery({
    queryKey: ecmKeys.complianceReport(rangeKey, params?.scheduleAreaId, params?.locationId),
    queryFn: () => fetchEcmComplianceReport(dateOrRange, params),
    enabled,
  })
}

export function useEcmGraphDashboard(
  filters?: {
    dateFrom?: string
    dateTo?: string
    scheduleAreaId?: string
    locationId?: string
    enabled?: boolean
  },
) {
  const { enabled = true, ...params } = filters ?? {}
  return useQuery({
    queryKey: ecmKeys.graphDashboard(params),
    queryFn: () => fetchEcmGraphDashboard(params),
    enabled,
    refetchInterval: 60_000,
  })
}

export function useEcmAuditTrail(jobId: string | null | undefined) {
  return useQuery({
    queryKey: ecmKeys.audit(jobId ?? ''),
    queryFn: () => fetchEcmAuditTrail(jobId!),
    enabled: Boolean(jobId),
  })
}

export function useEcmNotifications(jobId: string | null | undefined) {
  return useQuery({
    queryKey: ecmKeys.notifications(jobId ?? ''),
    queryFn: () => fetchEcmNotifications(jobId!),
    enabled: Boolean(jobId),
  })
}

function useInvalidateEcmExceptions() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: [...ecmKeys.all, 'exceptions'] })
    void qc.invalidateQueries({ queryKey: ecmKeys.all })
  }
}

export function useAllowVisitContinue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, note }: { jobId: string; note?: string }) =>
      allowVisitContinue(jobId, note),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ecmKeys.visitDetail(vars.jobId) })
      void qc.invalidateQueries({ queryKey: ecmKeys.all, refetchType: 'active' })
    },
  })
}

export function useAuthoriseCheckInMethodGrant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      grantId,
      note,
    }: {
      jobId: string
      grantId: string
      note?: string
    }) => authoriseCheckInMethodGrant(jobId, grantId, note),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ecmKeys.visitDetail(vars.jobId) })
      void qc.invalidateQueries({ queryKey: ecmKeys.all, refetchType: 'active' })
    },
  })
}

export function useRejectCheckInMethodGrant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      grantId,
      note,
    }: {
      jobId: string
      grantId: string
      note?: string
    }) => rejectCheckInMethodGrant(jobId, grantId, note),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ecmKeys.visitDetail(vars.jobId) })
      void qc.invalidateQueries({ queryKey: ecmKeys.all, refetchType: 'active' })
    },
  })
}

export function useAcknowledgeEcmException() {
  const invalidate = useInvalidateEcmExceptions()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      acknowledgeEcmException(id, note),
    onSuccess: invalidate,
  })
}

export function useResolveEcmException() {
  const invalidate = useInvalidateEcmExceptions()
  return useMutation({
    mutationFn: ({
      id,
      reasonCode,
      note,
    }: {
      id: string
      reasonCode: string
      note?: string
    }) => resolveEcmException(id, reasonCode, note),
    onSuccess: invalidate,
  })
}

export function useCloseEcmException() {
  const invalidate = useInvalidateEcmExceptions()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => closeEcmException(id, note),
    onSuccess: invalidate,
  })
}

export function useRecordManualAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      ...body
    }: {
      jobId: string
      employeeId: string
      eventType: 'CHECK_IN' | 'CHECK_OUT'
      occurredAt: string
      reasonCode: string
      note?: string
      overrideGeofence?: boolean
    }) => recordManualAttendance(jobId, body),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ecmKeys.visitDetail(vars.jobId) })
      void qc.invalidateQueries({ queryKey: ecmKeys.all })
    },
  })
}

export function useAmendEcmAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      ...body
    }: {
      jobId: string
      employeeId: string
      eventType: 'CHECK_IN' | 'CHECK_OUT'
      occurredAt: string
      reasonCode: string
      note?: string
      originalEventId?: string
    }) => amendEcmAttendance(jobId, body),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ecmKeys.visitDetail(vars.jobId) })
      void qc.invalidateQueries({ queryKey: ecmKeys.all })
    },
  })
}

export function useCreateEcmNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      ...body
    }: {
      jobId: string
      method: string
      outcome?: string
      contactName?: string
      contactRole?: string
      etaGiven?: string
      reasonGiven?: string
      replacementDetails?: string
      acceptedDeclined?: string
      notes?: string
      ecmExceptionId?: string
    }) => createEcmNotification(jobId, body),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ecmKeys.notifications(vars.jobId) })
      void qc.invalidateQueries({ queryKey: ecmKeys.audit(vars.jobId) })
    },
  })
}

export function useMissedTriage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      outcome,
      note,
    }: {
      jobId: string
      outcome: string
      note?: string
    }) => applyMissedTriage(jobId, outcome, note),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ecmKeys.visitDetail(vars.jobId) })
      void qc.invalidateQueries({ queryKey: ecmKeys.all })
    },
  })
}

export function useEcmThresholdLookups(enabled = true) {
  return useQuery({
    queryKey: ecmKeys.thresholdLookups(),
    queryFn: fetchEcmThresholdLookups,
    enabled,
    staleTime: 30_000,
  })
}

export function useUpdateEcmThresholdLookup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, valueInt }: { id: string; valueInt: number }) =>
      updateEcmThresholdLookup(id, valueInt),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ecmKeys.thresholdLookups() })
      void qc.invalidateQueries({ queryKey: ecmKeys.all })
    },
  })
}
