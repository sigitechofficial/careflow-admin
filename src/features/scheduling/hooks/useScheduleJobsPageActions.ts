import * as React from 'react'
import { getScheduledJob } from '@/features/scheduling/api/scheduling.api'
import { CARER_ROTA_CONFLICT_MESSAGE } from '@/features/scheduling/utils/schedule-job-carer-rota-conflict.util'
import type { ScheduleVisitWorkspaceTab } from '@/features/scheduling/components/ScheduleVisitWorkspaceContent'
import {
  useAllocateJob,
  useUnallocateJob,
  useUpdateScheduledJob,
} from '@/features/scheduling/hooks/useSchedulingMutations'
import type { ScheduleJobsPageSearch } from '@/features/scheduling/hooks/useScheduleJobsUrlState'
import type { ScheduleJobsPageDialogs } from '@/features/scheduling/hooks/useScheduleJobsPageDialogs'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type {
  ScheduleJobAllocateDialogPanel,
  ScheduleJobContextAction,
} from '@/features/scheduling/types/schedule-job-context-actions.types'
import {
  isScheduleJobOutcomeLocked,
  isScheduleJobReadOnly,
} from '@/features/scheduling/types/schedule-job-context-actions.types'
import {
  allocationWarningsSummary,
  isDragAllocationHardBlock,
  warningsFromAllocateError,
} from '@/features/scheduling/utils/allocate-job-warnings.util'
import { scheduleJobCarerRotaConflictMessage } from '@/features/scheduling/utils/schedule-job-carer-rota-conflict.util'
import {
  rowsEqual,
  scheduleTimesChanged,
  type JobDropPayload,
} from '@/features/scheduling/utils/schedule-jobs-drag.util'
import { scheduleRunDragConflictMessage } from '@/features/scheduling/utils/schedule-run-drag.util'
import {
  scheduleJobCarerLocationConflictMessage,
  type EmployeeLocationCatalogRow,
} from '@/features/scheduling/utils/schedule-jobs-location-filter.util'
import type { ScheduleJobsBoardRowAxis } from '@/features/scheduling/utils/schedule-jobs-board-axis.util'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ScheduleJobsUrlUpdatePartial } from '@/features/scheduling/hooks/useScheduleJobsBoardData'

type DayBoardQueries = {
  employeesQuery: Pick<UseQueryResult, 'refetch'>
  dayRunsQuery: Pick<UseQueryResult, 'refetch'>
}

type Params = {
  search: ScheduleJobsPageSearch
  rowAxis: ScheduleJobsBoardRowAxis
  allJobs: TimelineJob[]
  boardAfterRequiredCarersAllJobs: TimelineJob[]
  employeeLocationCatalog: Map<string, EmployeeLocationCatalogRow>
  locationNameMap: Map<string, string>
  dialogs: ScheduleJobsPageDialogs
  updateScheduleJobsUrl: (partial?: ScheduleJobsUrlUpdatePartial) => void
  refreshBoard: () => Promise<void>
  dayBoardQueries: DayBoardQueries
  runEdit: { openEditRunById: (runId: string) => void }
  runReassign: { openForRunId: (runId: string) => void }
}

export function useScheduleJobsPageActions({
  search,
  rowAxis,
  allJobs,
  boardAfterRequiredCarersAllJobs,
  employeeLocationCatalog,
  locationNameMap,
  dialogs,
  updateScheduleJobsUrl,
  refreshBoard,
  dayBoardQueries,
  runEdit,
  runReassign,
}: Params) {
  const updateJob = useUpdateScheduledJob()
  const allocate = useAllocateJob()
  const unallocate = useUnallocateJob()

  const {
    setAllocateJobId,
    setAllocateDialogPanel,
    setAllocateOpen,
    setNotesJob,
    setNotesOpen,
    setCompleteJobTarget,
    setCompleteOpen,
    openCompleteDialog,
    setCancelJobTarget,
    setCancelOpen,
    setReinstateJobTarget,
    setReinstateOpen,
    setWorkspaceJob,
    setWorkspaceTab,
    setWorkspaceOpen,
    setSavingJobId,
  } = dialogs

  const refetchDayBoard = React.useCallback(async () => {
    await Promise.all([dayBoardQueries.employeesQuery.refetch(), dayBoardQueries.dayRunsQuery.refetch()])
  }, [dayBoardQueries.dayRunsQuery, dayBoardQueries.employeesQuery])

  const openVisitWorkspace = React.useCallback(
    (job: TimelineJob, tab: ScheduleVisitWorkspaceTab = 'overview') => {
      setWorkspaceJob(job)
      setWorkspaceTab(tab)
      setWorkspaceOpen(true)
    },
    [setWorkspaceJob, setWorkspaceOpen, setWorkspaceTab],
  )

  const openAllocate = React.useCallback(
    (job: TimelineJob, panel: ScheduleJobAllocateDialogPanel = 'allocate') => {
      setAllocateJobId(job.id)
      setAllocateDialogPanel(panel)
      setAllocateOpen(true)
    },
    [setAllocateDialogPanel, setAllocateJobId, setAllocateOpen],
  )

  const resolveJobForAction = React.useCallback(
    async (jobId: string): Promise<TimelineJob | null> => {
      const fromBoard = allJobs.find((row) => row.id === jobId)
      if (fromBoard) return fromBoard
      try {
        return await getScheduledJob(jobId)
      } catch {
        return null
      }
    },
    [allJobs],
  )

  React.useEffect(() => {
    const jobId = search.actionJobId
    const action = search.visitAction
    if (!jobId || !action) return

    let cancelled = false
    void resolveJobForAction(jobId).then((job) => {
      if (cancelled || !job) return
      if (action === 'workspace') {
        openVisitWorkspace(job, search.visitTab ?? 'overview')
      } else if (action === 'complete') {
        openCompleteDialog(job)
      } else if (action === 'notes') {
        setNotesJob(job)
        setNotesOpen(true)
      } else if (action === 'allocate') {
        setAllocateJobId(job.id)
        setAllocateDialogPanel('allocate')
        setAllocateOpen(true)
      }
      updateScheduleJobsUrl()
    })

    return () => {
      cancelled = true
    }
  }, [
    search.actionJobId,
    search.visitAction,
    search.visitTab,
    resolveJobForAction,
    openVisitWorkspace,
    updateScheduleJobsUrl,
    setAllocateDialogPanel,
    setAllocateJobId,
    setAllocateOpen,
    openCompleteDialog,
    setNotesJob,
    setNotesOpen,
  ])

  const handleUnallocateJob = React.useCallback(
    async (job: TimelineJob) => {
      const employeeIds = (job.allocations ?? []).map((allocation) => allocation.employeeId)
      if (employeeIds.length === 0) return
      setSavingJobId(job.id)
      try {
        for (const employeeId of employeeIds) {
          await unallocate.mutateAsync({ jobId: job.id, employeeId })
        }
        toastSuccess('Job unallocated', 'All carers were removed from this job.')
        await refreshBoard()
      } catch (error) {
        toastApiError(error, 'Could not unallocate job')
        await refreshBoard()
      } finally {
        setSavingJobId(null)
      }
    },
    [refreshBoard, setSavingJobId, unallocate],
  )

  const handleJobAction = React.useCallback(
    (job: TimelineJob, action: ScheduleJobContextAction) => {
      const readOnly = isScheduleJobReadOnly(job)
      const outcomeLocked = isScheduleJobOutcomeLocked(job)
      const allowOutcomeOnCompleted =
        !outcomeLocked && (action === 'complete-job' || action === 'mark-incomplete')
      if (
        readOnly &&
        !allowOutcomeOnCompleted &&
        action !== 'allocate-employees' &&
        action !== 'add-notes' &&
        action !== 'open-visit-workspace' &&
        action !== 'open-run' &&
        action !== 'reassign-run' &&
        action !== 'reinstate-job'
      ) {
        return
      }
      if (readOnly && action === 'add-notes') {
        setNotesJob(job)
        setNotesOpen(true)
        return
      }

      switch (action) {
        case 'open-visit-workspace':
          openVisitWorkspace(job)
          return
        case 'open-run':
          if (job.scheduleRunId) runEdit.openEditRunById(job.scheduleRunId)
          return
        case 'reassign-run':
          if (job.scheduleRunId) runReassign.openForRunId(job.scheduleRunId)
          return
        case 'unallocate-job':
          void handleUnallocateJob(job)
          return
        case 'complete-job':
          openCompleteDialog(job)
          return
        case 'mark-incomplete':
          openCompleteDialog(job, 'PARTIALLY_COMPLETED')
          return
        case 'cancel-job':
          setCancelJobTarget(job)
          setCancelOpen(true)
          return
        case 'reinstate-job':
          setReinstateJobTarget(job)
          setReinstateOpen(true)
          return
        case 'add-notes':
          setNotesJob(job)
          setNotesOpen(true)
          return
        case 'allocate-employees':
          openAllocate(job, 'allocate')
          return
        case 'unallocate-employees':
          openAllocate(job, 'unallocate')
          return
        case 'change-time':
          openAllocate(job, 'time')
          return
        default:
          return
      }
    },
    [
      handleUnallocateJob,
      openAllocate,
      openCompleteDialog,
      openVisitWorkspace,
      runEdit,
      runReassign,
      setCancelJobTarget,
      setCancelOpen,
      setNotesJob,
      setNotesOpen,
      setReinstateJobTarget,
      setReinstateOpen,
    ],
  )

  const handleJobDrop = React.useCallback(
    async (payload: JobDropPayload) => {
      const { job, sourceRow, targetRow, scheduledStartDateTime, scheduledEndDateTime } = payload
      if (isScheduleJobReadOnly(job)) {
        toastWarning('Cannot move job', 'Completed and cancelled jobs are read only.')
        return
      }

      if (rowAxis === 'service-users') {
        if (targetRow.kind === 'service-user' && targetRow.serviceUserId !== job.serviceUserId) {
          toastWarning('Cannot move visit', 'This visit stays on its service user row.')
          return
        }
        if (targetRow.kind === 'unassigned' || targetRow.kind === 'cancelled') {
          return
        }
        if (!scheduleTimesChanged(job, { scheduledStartDateTime, scheduledEndDateTime })) {
          return
        }
        const runConflict = scheduleRunDragConflictMessage(job, {
          targetRow,
          scheduledStartDateTime,
        })
        if (runConflict) {
          toastWarning('Run schedule conflict', runConflict)
        }
        setSavingJobId(job.id)
        try {
          await updateJob.mutateAsync({
            jobId: job.id,
            scheduledStartDateTime,
            scheduledEndDateTime,
          })
          toastSuccess('Schedule updated')
          await refetchDayBoard()
        } catch (error) {
          toastApiError(error, 'Could not update schedule')
          await refetchDayBoard()
        } finally {
          setSavingJobId(null)
        }
        return
      }

      if (targetRow.kind === 'cancelled') {
        toastWarning('Cannot move job', 'Cancelled visits stay on the Cancelled row.')
        return
      }
      const timesChanged = scheduleTimesChanged(job, { scheduledStartDateTime, scheduledEndDateTime })
      const rowChanged = !rowsEqual(sourceRow, targetRow)
      if (!timesChanged && !rowChanged) return

      const sourceCarerId = sourceRow.kind === 'carer' ? sourceRow.employeeId : null
      const targetCarerId = targetRow.kind === 'carer' ? targetRow.employeeId : null

      if (targetCarerId && targetCarerId !== sourceCarerId && targetRow.kind === 'carer') {
        const locationConflict = scheduleJobCarerLocationConflictMessage(
          job,
          targetRow,
          employeeLocationCatalog,
          locationNameMap,
        )
        if (locationConflict) {
          toastWarning('Different location', locationConflict)
          return
        }
      }

      const assignCarerId =
        targetRow.kind === 'carer'
          ? targetCarerId
          : sourceRow.kind === 'carer' && !targetCarerId
            ? sourceCarerId
            : null
      if (assignCarerId) {
        const rotaConflict = scheduleJobCarerRotaConflictMessage(
          job,
          assignCarerId,
          boardAfterRequiredCarersAllJobs,
          { scheduledStartDateTime, scheduledEndDateTime },
        )
        if (rotaConflict) {
          toastWarning('Carer not assigned', rotaConflict)
          return
        }
      }

      const runConflict = scheduleRunDragConflictMessage(job, {
        targetRow,
        scheduledStartDateTime,
      })
      if (runConflict) {
        toastWarning('Run schedule conflict', runConflict)
      }

      setSavingJobId(job.id)
      try {
        if (timesChanged) {
          await updateJob.mutateAsync({
            jobId: job.id,
            scheduledStartDateTime,
            scheduledEndDateTime,
          })
        }

        if (targetCarerId && targetCarerId !== sourceCarerId) {
          if (sourceCarerId) {
            await unallocate.mutateAsync({ jobId: job.id, employeeId: sourceCarerId })
          }
          try {
            await allocate.mutateAsync({ jobId: job.id, employeeId: targetCarerId, force: false })
          } catch (allocateError) {
            const warnings = warningsFromAllocateError(allocateError)
            if (warnings.length > 0) {
              if (!isDragAllocationHardBlock(warnings)) {
                await allocate.mutateAsync({
                  jobId: job.id,
                  employeeId: targetCarerId,
                  force: true,
                })
              } else {
                toastWarning(
                  'Carer not assigned',
                  allocationWarningsSummary(warnings) || CARER_ROTA_CONFLICT_MESSAGE,
                )
                if (sourceCarerId) {
                  await allocate.mutateAsync({
                    jobId: job.id,
                    employeeId: sourceCarerId,
                    force: true,
                  })
                }
                await refetchDayBoard()
                return
              }
            } else {
              throw allocateError
            }
          }
        } else if (!targetCarerId && sourceCarerId) {
          await unallocate.mutateAsync({ jobId: job.id, employeeId: sourceCarerId })
        }

        toastSuccess('Schedule updated')
        await refetchDayBoard()
      } catch (error) {
        toastApiError(error, 'Could not update schedule')
        await refetchDayBoard()
      } finally {
        setSavingJobId(null)
      }
    },
    [
      allocate,
      boardAfterRequiredCarersAllJobs,
      employeeLocationCatalog,
      locationNameMap,
      refetchDayBoard,
      rowAxis,
      setSavingJobId,
      unallocate,
      updateJob,
    ],
  )

  return {
    openAllocate,
    openVisitWorkspace,
    handleJobAction,
    handleJobDrop,
    handleUnallocateJob,
  }
}
