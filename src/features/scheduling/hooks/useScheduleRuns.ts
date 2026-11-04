import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addJobsToScheduleRun,
  cancelScheduleRun,
  createScheduleRun,
  deleteScheduleRun,
  getScheduleRun,
  listScheduleRuns,
  previewRunCarer,
  reorderScheduleRunJobs,
  removeJobFromScheduleRun,
  syncScheduleRunCarer,
  updateScheduleRun,
  type CreateScheduleRunPayload,
  type ListScheduleRunsParams,
  type SyncScheduleRunCarerPayload,
  type UpdateScheduleRunPayload,
} from '@/features/scheduling/api/schedule-runs.api'
import { schedulingKeys } from '@/features/scheduling/keys'

export function useScheduleRunsList(params: ListScheduleRunsParams, enabled = true) {
  return useQuery({
    queryKey: schedulingKeys.runs({
      runDate: params.runDate,
      employeeId: params.employeeId,
      status: params.status,
    }),
    queryFn: ({ signal }) => listScheduleRuns({ ...params, includeJobs: true, limit: 100 }, { signal }),
    enabled: enabled && Boolean(params.runDate),
  })
}

export function useScheduleRunDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: schedulingKeys.runDetail(id ?? ''),
    queryFn: ({ signal }) => getScheduleRun(id!, { signal }),
    enabled: enabled && Boolean(id),
  })
}

export function useScheduleRunMutations(date: string) {
  const queryClient = useQueryClient()

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: schedulingKeys.runs({ runDate: date }) }),
      queryClient.invalidateQueries({ queryKey: schedulingKeys.dayRuns(date) }),
      queryClient.invalidateQueries({ queryKey: schedulingKeys.employeesDay(date) }),
    ])
  }

  const create = useMutation({
    mutationFn: (payload: CreateScheduleRunPayload) => createScheduleRun(payload),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateScheduleRunPayload }) =>
      updateScheduleRun(id, payload),
    onSuccess: invalidate,
  })

  const addJobs = useMutation({
    mutationFn: ({ id, visitIds }: { id: string; visitIds: string[] }) => addJobsToScheduleRun(id, visitIds),
    onSuccess: invalidate,
  })

  const removeJob = useMutation({
    mutationFn: ({ runId, jobId }: { runId: string; jobId: string }) => removeJobFromScheduleRun(runId, jobId),
    onSuccess: invalidate,
  })

  const reorderJobs = useMutation({
    mutationFn: ({ id, visitIds }: { id: string; visitIds: string[] }) => reorderScheduleRunJobs(id, visitIds),
    onSuccess: invalidate,
  })

  const cancel = useMutation({
    mutationFn: (id: string) => cancelScheduleRun(id),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteScheduleRun(id),
    onSuccess: invalidate,
  })

  const syncCarer = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: SyncScheduleRunCarerPayload }) =>
      syncScheduleRunCarer(id, payload),
    onSuccess: () => {
      void invalidate()
      // Visits over the carer's weekly hours become requests on Hours approvals.
      void queryClient.invalidateQueries({ queryKey: ['hours-approvals'] })
    },
  })

  return { create, update, addJobs, removeJob, reorderJobs, cancel, remove, syncCarer, invalidate }
}

/** What putting a carer on these run visits would do: weekly hours and checks (nothing saved). */
export function useRunCarerPreview(input: Parameters<typeof previewRunCarer>[0] | null) {
  return useQuery({
    queryKey: [...schedulingKeys.all(), 'run-carer-preview', input] as const,
    queryFn: ({ signal }) => previewRunCarer(input!, { signal }),
    enabled: input != null && input.visitIds.length > 0,
    staleTime: 0,
  })
}
