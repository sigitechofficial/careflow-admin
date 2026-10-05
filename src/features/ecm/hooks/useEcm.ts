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
  closeSosEcmException,
  createEcmNotification,
  fetchEcmAuditTrail,
  fetchEcmComplianceReport,
  fetchEcmDailyOpsReport,
  fetchEcmExceptions,
  fetchEcmVisitSos,
  fetchEcmGraphDashboard,
  fetchEcmHealth,
  fetchEcmLiveDashboard,
  fetchEcmVisitsTable,
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
import type { EcmExceptionRow } from '@/features/ecm/types/ecm.types'
import {
  markCheckInRequestDecided,
  markLeftVisitAreaAllowed,
  markLiveOfficeAlertAcknowledged,
  markLiveOfficeAlertClosed,
  removeExceptionById,
} from '@/features/ecm/utils/ecm-urgent-alert.util'
import { toastSosAckFcm, toastSosAckFcmMany } from '@/features/ecm/utils/sos-ack-fcm-toast'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

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

/** ECM visit rows for one service user or employee (Visits tabs). */
export function useEcmVisitsTable(
  params: { dateFrom: string; dateTo: string; serviceUserId?: string; employeeId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ecmKeys.visitsTable(params),
    queryFn: () => fetchEcmVisitsTable(params),
    enabled: enabled && Boolean(params.serviceUserId || params.employeeId),
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

export function useEcmVisitSos(jobId: string | null | undefined) {
  return useQuery({
    queryKey: ecmKeys.visitSos(jobId ?? ''),
    queryFn: () => fetchEcmVisitSos(jobId!),
    enabled: Boolean(jobId),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  })
}

export function useEcmExceptions(
  options?: { limit?: number; serviceUserId?: string; locationId?: string; enabled?: boolean },
) {
  const { limit = 100, serviceUserId, locationId, enabled = true } = options ?? {}
  return useQuery({
    queryKey: ecmKeys.exceptions({ limit, serviceUserId, locationId }),
    queryFn: () => fetchEcmExceptions({ limit, serviceUserId, locationId }),
    enabled,
    refetchInterval: 60_000,
    refetchOnMount: 'always',
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
    // Inactive Schedule Jobs observers must refetch too — they use a different
    // exceptions query key (limit) and otherwise keep the unacked SOS popup.
    void qc.invalidateQueries({ queryKey: [...ecmKeys.all, 'exceptions'], refetchType: 'all' })
    void qc.invalidateQueries({ queryKey: ecmKeys.all, refetchType: 'active' })
  }
}

function patchExceptionsCache(
  qc: ReturnType<typeof useQueryClient>,
  patch: (rows: EcmExceptionRow[]) => EcmExceptionRow[],
) {
  qc.setQueriesData({ queryKey: [...ecmKeys.all, 'exceptions'] }, (current) => {
    if (!Array.isArray(current)) return current
    return patch(current as EcmExceptionRow[])
  })
}

export function useAllowVisitContinue() {
  const qc = useQueryClient()
  const invalidate = useInvalidateEcmExceptions()
  return useMutation({
    mutationFn: ({
      jobId,
      reasonId,
      note,
    }: {
      jobId: string
      reasonId: string
      note?: string
    }) => allowVisitContinue(jobId, { reasonId, note }),
    onSuccess: (_data, vars) => {
      toastSuccess('Carer can continue this visit')
      patchExceptionsCache(qc, (rows) => markLeftVisitAreaAllowed(rows, vars.jobId))
      void qc.invalidateQueries({ queryKey: ecmKeys.visitDetail(vars.jobId) })
      invalidate()
    },
    onError: e => toastApiError(e, 'Could not allow this visit'),
  })
}

export function useAuthoriseCheckInMethodGrant() {
  const qc = useQueryClient()
  const invalidate = useInvalidateEcmExceptions()
  return useMutation({
    mutationFn: ({
      jobId,
      grantId,
      reasonId,
      note,
    }: {
      jobId: string
      grantId: string
      reasonId: string
      note?: string
    }) => authoriseCheckInMethodGrant(jobId, grantId, { reasonId, note }),
    onSuccess: (_data, vars) => {
      toastSuccess('Manual check-in authorised')
      patchExceptionsCache(qc, (rows) => markCheckInRequestDecided(rows, vars.jobId, 'AUTHORISED'))
      void qc.invalidateQueries({ queryKey: ecmKeys.visitDetail(vars.jobId) })
      invalidate()
    },
    onError: e => toastApiError(e, 'Could not authorise Manual'),
  })
}

export function useRejectCheckInMethodGrant() {
  const qc = useQueryClient()
  const invalidate = useInvalidateEcmExceptions()
  return useMutation({
    mutationFn: ({
      jobId,
      grantId,
      reasonCode,
      note,
    }: {
      jobId: string
      grantId: string
      reasonCode: string
      note?: string
    }) => rejectCheckInMethodGrant(jobId, grantId, { reasonCode, note }),
    onSuccess: (_data, vars) => {
      toastSuccess('Outside area check-in rejected')
      patchExceptionsCache(qc, (rows) => markCheckInRequestDecided(rows, vars.jobId, 'REJECTED'))
      void qc.invalidateQueries({ queryKey: ecmKeys.visitDetail(vars.jobId) })
      invalidate()
    },
    onError: e => toastApiError(e, 'Could not reject this request'),
  })
}

export function useAcknowledgeEcmException() {
  const qc = useQueryClient()
  const invalidate = useInvalidateEcmExceptions()
  const mutation = useMutation({
    mutationFn: ({
      id,
      note,
    }: {
      id: string
      note?: string
      skipToast?: boolean
    }) => acknowledgeEcmException(id, note),
    onSuccess: (data, vars) => {
      if (!vars.skipToast) toastSosAckFcm(data.fcm)
      patchExceptionsCache(qc, (rows) =>
        markLiveOfficeAlertAcknowledged(rows, vars.id, new Date().toISOString()),
      )
      invalidate()
    },
    onError: e => toastApiError(e, 'Could not acknowledge this SOS'),
  })

  const acknowledgeAll = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids.map(id => id.trim()).filter(Boolean))]
      if (unique.length === 0) return
      const skipToast = unique.length > 1
      const results = await Promise.all(
        unique.map(id => mutation.mutateAsync({ id, skipToast })),
      )
      if (skipToast) toastSosAckFcmMany(results.map(row => row.fcm))
    },
    [mutation],
  )

  return { ...mutation, acknowledgeAll }
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
  const qc = useQueryClient()
  const invalidate = useInvalidateEcmExceptions()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => closeEcmException(id, note),
    onSuccess: (_data, vars) => {
      patchExceptionsCache(qc, (rows) => markLiveOfficeAlertClosed(rows, vars.id))
      invalidate()
    },
  })
}

export function useCloseSosEcmException() {
  const qc = useQueryClient()
  const invalidate = useInvalidateEcmExceptions()
  return useMutation({
    mutationFn: ({
      id,
      actionCode,
      outcomeCode,
      note,
      actionNote,
    }: {
      id: string
      actionCode: string
      outcomeCode: string
      note?: string
      actionNote?: string
    }) => closeSosEcmException(id, actionCode, outcomeCode, note, actionNote),
    onSuccess: (_data, vars) => {
      toastSuccess('SOS closed')
      patchExceptionsCache(qc, (rows) => removeExceptionById(rows, vars.id))
      invalidate()
    },
    onError: e => toastApiError(e, 'Could not close this SOS'),
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
