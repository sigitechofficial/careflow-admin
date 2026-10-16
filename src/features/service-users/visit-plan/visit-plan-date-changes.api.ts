import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { serviceUserKeys } from '@/features/service-users/keys'
import { schedulingKeys } from '@/features/scheduling/keys'
import type {
  VisitCancellationReasonCode,
  VisitChargeDecision,
} from '@/features/scheduling/utils/visit-cancellation.constants'
import type { VisitPlanNightDuty, VisitPlanStatus } from '@/features/service-users/visit-plan/types'

export type VisitCancelledByParty = 'SERVICE_USER' | 'AGENCY' | 'OTHER'

export const VISIT_CANCELLED_BY_OPTIONS: Array<{ value: VisitCancelledByParty; label: string }> = [
  { value: 'SERVICE_USER', label: 'Service user or family' },
  { value: 'AGENCY', label: 'Our agency' },
  { value: 'OTHER', label: 'Other' },
]

/** Reasons offered for each "Cancelled by" choice — must match the API list. */
export const VISIT_CANCELLATION_REASONS_BY_PARTY: Record<VisitCancelledByParty, VisitCancellationReasonCode[]> = {
  SERVICE_USER: ['CLIENT_REQUEST', 'CLIENT_HOSPITAL_ADMISSION', 'SERVICE_NOT_REQUIRED', 'OTHER'],
  AGENCY: ['PROVIDER_UNABLE_TO_STAFF', 'PROVIDER_ROTA_ERROR', 'WEATHER_OR_EMERGENCY', 'DUPLICATE_ENTRY', 'OTHER'],
  OTHER: ['OTHER'],
}

export function visitCancelledByLabel(value: string | null | undefined): string {
  return VISIT_CANCELLED_BY_OPTIONS.find((o) => o.value === value)?.label ?? '—'
}

export type CancellableVisit = {
  visitPlanSlotId: string
  slotCode: string
  slotLabel: string
  date: string
  startDateTime: string
  endDateTime: string
  durationMinutes: number
  status: 'ON_ROTA' | 'NOT_ON_ROTA'
  scheduledJobId: string | null
  carerEmployeeIds: string[]
  timeCritical: boolean
}

export type VisitPlanDateChange = {
  id: string
  visitPlanSlotId: string
  slotCode: string
  slotLabel: string
  date: string
  type: 'CANCELLED' | 'EXTRA'
  plannedStartTime: string
  plannedEndTime: string
  cancelledByParty: VisitCancelledByParty | null
  cancelledByDescription: string | null
  reasonCode: VisitCancellationReasonCode | null
  reasonLabel: string | null
  notes: string
  chargeDecision: VisitChargeDecision | null
  assignedEmployeeIds: string[]
  /** Extra visits: time slot code, duration, carers needed and night type, for editing. */
  roundCode?: string
  durationMinutes?: number | null
  requiredCarers?: number | null
  nightDuty?: VisitPlanNightDuty | null
  /** Extra visits only: true while the rota visit has not started. */
  canEdit?: boolean
  canDelete?: boolean
  source: 'MANUAL' | 'ABSENCE'
  recordedByName: string | null
  recordedAt: string
}

export type CancelVisitsPreviewItem = {
  visitPlanSlotId: string
  date: string
  available: boolean
  status: 'ON_ROTA' | 'NOT_ON_ROTA' | null
  timeCritical: boolean
  noticeHours: number | null
  suggestedDecision: 'CHARGE' | 'NO_CHARGE' | 'PENDING_REVIEW' | null
  chargePercent: number | null
  explanation: string | null
}

export type CancelVisitsPreview = {
  fundingTypeCode: string | null
  fundingTypeName: string | null
  items: CancelVisitsPreviewItem[]
}

export type CancelVisitsPayload = {
  items: Array<{ visitPlanSlotId: string; date: string }>
  cancelledBy: VisitCancelledByParty
  cancelledByDescription?: string
  reasonCode: VisitCancellationReasonCode
  reasonNotes?: string
  chargeDecision?: VisitChargeDecision
  chargeDecisionNotes?: string
  welfareChecked: boolean
  familyNotified: boolean
  commissionerNotified: boolean
}

const base = (serviceUserId: string, planId: string) =>
  `/service-users/${serviceUserId}/visit-plans/${planId}/date-changes`

const dateChangeKeys = {
  all: (serviceUserId: string, planId: string) =>
    [...serviceUserKeys.visitPlans(serviceUserId), planId, 'date-changes'] as const,
  list: (serviceUserId: string, planId: string) =>
    [...dateChangeKeys.all(serviceUserId, planId), 'list'] as const,
  cancellable: (serviceUserId: string, planId: string, from: string, to: string) =>
    [...dateChangeKeys.all(serviceUserId, planId), 'cancellable', from, to] as const,
}

export function useVisitPlanDateChanges(serviceUserId: string, planId: string | undefined) {
  return useQuery({
    queryKey: dateChangeKeys.list(serviceUserId, planId ?? ''),
    enabled: Boolean(planId),
    queryFn: async () => {
      const res = await apiJson<ApiEnvelope<{ planStatus: VisitPlanStatus; changes: VisitPlanDateChange[] }>>(
        base(serviceUserId, planId!),
        { method: 'GET' },
      )
      return res.data
    },
  })
}

export function useCancellableVisits(
  serviceUserId: string,
  planId: string | undefined,
  range: { from: string; to: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: dateChangeKeys.cancellable(serviceUserId, planId ?? '', range.from, range.to),
    enabled: enabled && Boolean(planId),
    queryFn: async () => {
      const qs = new URLSearchParams()
      if (range.from) qs.set('from', range.from)
      if (range.to) qs.set('to', range.to)
      const res = await apiJson<ApiEnvelope<{ from: string; to: string; visits: CancellableVisit[] }>>(
        `${base(serviceUserId, planId!)}/cancellable-visits?${qs.toString()}`,
        { method: 'GET' },
      )
      return res.data
    },
  })
}

export async function previewCancelVisits(
  serviceUserId: string,
  planId: string,
  payload: Pick<CancelVisitsPayload, 'items' | 'cancelledBy' | 'reasonCode'>,
) {
  const res = await apiJson<ApiEnvelope<CancelVisitsPreview>>(`${base(serviceUserId, planId)}/cancel-preview`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export function useCancelVisitsOnDates(serviceUserId: string, planId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CancelVisitsPayload) => {
      const res = await apiJson<ApiEnvelope<{ cancelledOnRota: number; futureDatesStopped: number }>>(
        `${base(serviceUserId, planId!)}/cancel`,
        { method: 'POST', body: JSON.stringify(payload) },
      )
      return res.data
    },
    onSuccess: () => {
      // Plan queries carry the per-slot change counts and the amendment history.
      void qc.invalidateQueries({ queryKey: serviceUserKeys.visitPlans(serviceUserId) })
      void qc.invalidateQueries({ queryKey: schedulingKeys.all() })
    },
  })
}

export type ExtraVisitsPreviewPayload = {
  dates: string[]
  /** Time slot the visit belongs to; the start time must fall in its window. */
  roundCode?: string
  startTime: string
  durationMinutes: number
  requiredCarers: number
  employeeIds: string[]
  /** When editing: the extra visit being edited, so it is not counted as a clash with itself. */
  editingExceptionId?: string
}

export type ExtraVisitDateCheck = {
  date: string
  ok: boolean
  message: string | null
  clashEmployeeIds: string[]
}

export type ExtraVisitsPreview = {
  slotLabel: string | null
  slotMessage: string | null
  endTime: string
  dates: ExtraVisitDateCheck[]
}

export async function previewExtraVisits(serviceUserId: string, planId: string, payload: ExtraVisitsPreviewPayload) {
  const res = await apiJson<ApiEnvelope<ExtraVisitsPreview>>(`${base(serviceUserId, planId)}/extra-preview`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.data
}

export function useAddExtraVisits(serviceUserId: string, planId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      payload: ExtraVisitsPreviewPayload & { reason: string; notes?: string; nightDuty?: VisitPlanNightDuty },
    ) => {
      const res = await apiJson<
        ApiEnvelope<{ created: number; skipped: Array<{ date: string; message: string | null }> }>
      >(`${base(serviceUserId, planId!)}/extra`, { method: 'POST', body: JSON.stringify(payload) })
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.visitPlans(serviceUserId) })
      void qc.invalidateQueries({ queryKey: schedulingKeys.all() })
    },
  })
}

export type EditExtraVisitPayload = {
  startTime: string
  durationMinutes: number
  requiredCarers: number
  employeeIds: string[]
  reason: string
  nightDuty?: VisitPlanNightDuty
}

export function useEditExtraVisit(serviceUserId: string, planId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ exceptionId, payload }: { exceptionId: string; payload: EditExtraVisitPayload }) => {
      const res = await apiJson<ApiEnvelope<{ id: string; date: string; startTime: string; endTime: string }>>(
        `${base(serviceUserId, planId!)}/extra/${exceptionId}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
      )
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.visitPlans(serviceUserId) })
      void qc.invalidateQueries({ queryKey: schedulingKeys.all() })
    },
  })
}

export function useDeleteExtraVisit(serviceUserId: string, planId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ exceptionId, reason }: { exceptionId: string; reason: string }) => {
      const res = await apiJson<ApiEnvelope<{ id: string; date: string }>>(
        `${base(serviceUserId, planId!)}/extra/${exceptionId}`,
        { method: 'DELETE', body: JSON.stringify({ reason }) },
      )
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.visitPlans(serviceUserId) })
      void qc.invalidateQueries({ queryKey: schedulingKeys.all() })
    },
  })
}
