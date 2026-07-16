import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acknowledgeEcmException,
  amendEcmAttendance,
  applyMissedTriage,
  closeEcmException,
  createEcmNotification,
  fetchEcmAuditTrail,
  fetchEcmDailyOpsReport,
  fetchEcmExceptions,
  fetchEcmHealth,
  fetchEcmLiveDashboard,
  fetchEcmNotifications,
  fetchEcmReasonCodes,
  fetchEcmVisitDetail,
  recordManualAttendance,
  reevaluateEcmVisit,
  resolveEcmException,
} from '@/features/ecm/api/ecm.api'
import { ecmKeys } from '@/features/ecm/keys'

export function useEcmLiveDashboard(filters?: {
  date?: string
  search?: string
  scheduleAreaId?: string
  serviceUserId?: string
  enabled?: boolean
}) {
  const { enabled = true, ...params } = filters ?? {}
  return useQuery({
    queryKey: ecmKeys.liveDashboard(params),
    queryFn: () => fetchEcmLiveDashboard({ ...params, limit: 150 }),
    enabled,
    refetchInterval: 60_000,
  })
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

export function useEcmExceptions(limit = 50, enabled = true) {
  return useQuery({
    queryKey: ecmKeys.exceptions(limit),
    queryFn: () => fetchEcmExceptions(limit),
    enabled,
    refetchInterval: 60_000,
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

export function useEcmDailyOpsReport(date?: string, enabled = true) {
  return useQuery({
    queryKey: ecmKeys.dailyOps(date),
    queryFn: () => fetchEcmDailyOpsReport(date),
    enabled,
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
    void qc.invalidateQueries({ queryKey: ecmKeys.exceptions() })
    void qc.invalidateQueries({ queryKey: ecmKeys.all })
  }
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
