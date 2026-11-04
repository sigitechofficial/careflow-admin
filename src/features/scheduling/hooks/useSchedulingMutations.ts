import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CancelHousekeepingJobPayload } from '@/features/scheduling/utils/visit-cancellation.constants'
import {
  allocateJob,
  allocateJobTeam,
  buildSchedule,
  cancelHousekeepingJob,
  completeHousekeepingJob,
  confirmJobAllocation,
  reinstateHousekeepingJob,
  resetHousekeepingJobDelivery,
  resetHousekeepingJobTask,
  setJobLeadCarer,
  unallocateJob,
  updateJobAllocationTiming,
  updateScheduledJob,
} from '@/features/scheduling/api/scheduling.api'
import { ecmKeys } from '@/features/ecm/keys'
import { schedulingKeys } from '@/features/scheduling/keys'
import { serviceUserKeys } from '@/features/service-users/keys'

export function useBuildSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      scheduleDate: string
      buildSource: 'MANUAL' | 'TEMPLATE' | 'WITHOUT_TEMPLATE'
      areaIds?: string[]
      notes?: string
    }) => buildSchedule(payload),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: schedulingKeys.status(variables.scheduleDate) })
      void qc.invalidateQueries({ queryKey: schedulingKeys.all() })
    },
  })
}

export function useCompleteHousekeepingJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      status,
      notes,
      deliveredCarePlanFormIds,
      deliveredCarePlanDetails,
      extraCareNotes,
      actualStartDateTime,
      actualEndDateTime,
      carerActuals,
      overrunReason,
      timingExceptionReasonCode,
      timingExceptionNotes,
      missedReasonCode,
      missedReasonNotes,
      careNotDelivered,
      careNotDeliveredReasonCode,
      careNotDeliveredNotes,
    }: {
      jobId: string
      status?: string
      notes?: string
      deliveredCarePlanFormIds?: string[]
      deliveredCarePlanDetails?: import('@/features/scheduling/types/visit-care-plan-delivery.types').DeliveredCarePlanDetail[]
      extraCareNotes?: string
      actualStartDateTime?: string
      actualEndDateTime?: string
      carerActuals?: Array<{
        allocationId: string
        actualStartDateTime: string
        /** Omitted when marking visit Started (start-only). */
        actualEndDateTime?: string
      }>
      overrunReason?: string
      timingExceptionReasonCode?: string
      timingExceptionNotes?: string
      missedReasonCode?: string
      missedReasonNotes?: string
      careNotDelivered?: boolean
      careNotDeliveredReasonCode?: string
      careNotDeliveredNotes?: string
    }) =>
      completeHousekeepingJob(jobId, {
        status,
        notes,
        deliveredCarePlanFormIds,
        deliveredCarePlanDetails,
        extraCareNotes,
        actualStartDateTime,
        actualEndDateTime,
        carerActuals,
        overrunReason,
        timingExceptionReasonCode,
        timingExceptionNotes,
        missedReasonCode,
        missedReasonNotes,
        careNotDelivered,
        careNotDeliveredReasonCode,
        careNotDeliveredNotes,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: schedulingKeys.housekeeping() })
      invalidateSchedulingQueries(qc)
      // completeJob runs evaluateJobSafe server-side; refresh ECM live + exception queues.
      void qc.invalidateQueries({ queryKey: ecmKeys.all, refetchType: 'active' })
    },
  })
}

export function useReinstateHousekeepingJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, notes }: { jobId: string; notes?: string }) =>
      reinstateHousekeepingJob(jobId, { notes }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: schedulingKeys.housekeeping() })
      invalidateSchedulingQueries(qc)
      void qc.invalidateQueries({ queryKey: ecmKeys.all, refetchType: 'active' })
    },
  })
}

export function useResetHousekeepingJobDelivery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason: string }) =>
      resetHousekeepingJobDelivery(jobId, { reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: schedulingKeys.housekeeping() })
      invalidateSchedulingQueries(qc)
      void qc.invalidateQueries({ queryKey: ecmKeys.all, refetchType: 'active' })
    },
  })
}

export function useResetHousekeepingJobTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      assignmentId,
      reason,
    }: {
      jobId: string
      assignmentId: string
      reason: string
      serviceUserId?: string | null
    }) => resetHousekeepingJobTask(jobId, assignmentId, { reason }),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['visit-job-tasks', variables.jobId] })
      void qc.invalidateQueries({ queryKey: ['visit-observations', variables.jobId] })
      void qc.invalidateQueries({ queryKey: ['visit-timeline', variables.jobId] })
      void qc.invalidateQueries({ queryKey: schedulingKeys.job(variables.jobId) })
      void qc.invalidateQueries({ queryKey: schedulingKeys.housekeeping() })
      invalidateSchedulingQueries(qc)
      void qc.invalidateQueries({ queryKey: ecmKeys.all, refetchType: 'active' })
      if (variables.serviceUserId) {
        void qc.invalidateQueries({
          queryKey: [...serviceUserKeys.detail(variables.serviceUserId), 'medication-chart'],
        })
        void qc.invalidateQueries({ queryKey: serviceUserKeys.observations(variables.serviceUserId) })
      }
    },
  })
}

export function useCancelHousekeepingJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, ...payload }: CancelHousekeepingJobPayload & { jobId: string }) =>
      cancelHousekeepingJob(jobId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: schedulingKeys.housekeeping() })
      invalidateSchedulingQueries(qc)
      void qc.invalidateQueries({ queryKey: ecmKeys.all, refetchType: 'active' })
    },
  })
}

function invalidateSchedulingQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: schedulingKeys.all() })
}

function invalidateVisitPlanForAllocation(
  qc: ReturnType<typeof useQueryClient>,
  data?: { scheduledJob?: { serviceUserId?: string | null } | null },
) {
  const serviceUserId = data?.scheduledJob?.serviceUserId
  if (serviceUserId) {
    void qc.invalidateQueries({ queryKey: serviceUserKeys.visitPlans(serviceUserId) })
  }
}

export function useUpdateScheduledJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      scheduledStartDateTime,
      scheduledEndDateTime,
      notes,
    }: {
      jobId: string
      scheduledStartDateTime?: string
      scheduledEndDateTime?: string | null
      notes?: string | null
    }) => updateScheduledJob(jobId, { scheduledStartDateTime, scheduledEndDateTime, notes }),
    onSuccess: () => invalidateSchedulingQueries(qc),
  })
}

export function useAllocateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      employeeId,
      scheduledVisitId,
      force,
      notes,
      isLeadCarer,
      scheduledStartDateTime,
      scheduledEndDateTime,
    }: {
      jobId: string
      employeeId: string
      scheduledVisitId?: string
      force?: boolean
      notes?: string
      isLeadCarer?: boolean
      scheduledStartDateTime?: string
      scheduledEndDateTime?: string
    }) =>
      allocateJob(jobId, {
        employeeId,
        scheduledVisitId,
        force,
        notes,
        isLeadCarer,
        scheduledStartDateTime,
        scheduledEndDateTime,
      }),
    onSuccess: (result) => {
      invalidateSchedulingQueries(qc)
      invalidateVisitPlanForAllocation(qc, result.data ?? undefined)
    },
  })
}

/** Multi-carer visit: whole team (or missing carers) in one all-or-nothing save. */
export function useAllocateJobTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      ...body
    }: {
      jobId: string
      employeeIds: string[]
      leadEmployeeId: string
      scheduledVisitId?: string
      force?: boolean
      notes?: string
      scheduledStartDateTime?: string
      scheduledEndDateTime?: string
    }) => allocateJobTeam(jobId, body),
    onSuccess: (result) => {
      invalidateSchedulingQueries(qc)
      invalidateVisitPlanForAllocation(qc, result.data[0])
    },
  })
}

export function useUpdateJobAllocationTiming() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      allocationId,
      scheduledStartDateTime,
      scheduledEndDateTime,
      isLeadCarer,
      notes,
    }: {
      jobId: string
      allocationId: string
      scheduledStartDateTime?: string
      scheduledEndDateTime?: string
      isLeadCarer?: boolean
      notes?: string
    }) =>
      updateJobAllocationTiming(jobId, allocationId, {
        scheduledStartDateTime,
        scheduledEndDateTime,
        isLeadCarer,
        notes,
      }),
    onSuccess: (result) => {
      invalidateSchedulingQueries(qc)
      invalidateVisitPlanForAllocation(qc, result.data)
    },
  })
}

export function useSetJobLeadCarer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, employeeId }: { jobId: string; employeeId: string }) =>
      setJobLeadCarer(jobId, { employeeId }),
    onSuccess: (result) => {
      invalidateSchedulingQueries(qc)
      invalidateVisitPlanForAllocation(qc, result.data)
    },
  })
}

export function useUnallocateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      employeeId,
      reason,
    }: {
      jobId: string
      employeeId: string
      reason?: string
    }) => unallocateJob(jobId, { employeeId, reason }),
    onSuccess: (result) => {
      invalidateSchedulingQueries(qc)
      invalidateVisitPlanForAllocation(qc, result.data)
    },
  })
}

export function useConfirmJobAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      jobId,
      allocationId,
      notes,
    }: {
      jobId: string
      allocationId: string
      notes?: string
    }) => confirmJobAllocation(jobId, allocationId, { notes }),
    onSuccess: (result) => {
      invalidateSchedulingQueries(qc)
      invalidateVisitPlanForAllocation(qc, result.data)
    },
  })
}
