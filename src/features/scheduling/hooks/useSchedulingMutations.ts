import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  allocateJob,
  buildSchedule,
  cancelHousekeepingJob,
  completeHousekeepingJob,
  unallocateJob,
  updateScheduledJob,
} from '@/features/scheduling/api/scheduling.api'
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
    mutationFn: ({ jobId, notes }: { jobId: string; notes?: string }) =>
      completeHousekeepingJob(jobId, notes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: schedulingKeys.housekeeping() })
    },
  })
}

export function useCancelHousekeepingJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, notes }: { jobId: string; notes?: string }) =>
      cancelHousekeepingJob(jobId, notes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: schedulingKeys.housekeeping() })
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
    }: {
      jobId: string
      scheduledStartDateTime?: string
      scheduledEndDateTime?: string | null
    }) => updateScheduledJob(jobId, { scheduledStartDateTime, scheduledEndDateTime }),
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
    }: {
      jobId: string
      employeeId: string
      scheduledVisitId?: string
      force?: boolean
      notes?: string
    }) => allocateJob(jobId, { employeeId, scheduledVisitId, force, notes }),
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
