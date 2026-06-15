import * as React from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { PageHeader } from '@/shared/ui/page-elements'
import { listAllEmployees } from '@/features/employees/api'
import { employeeKeys } from '@/features/employees/keys'
import { ScheduleJobAllocateDialog } from '@/features/scheduling/components/ScheduleJobAllocateDialog'
import { ScheduleJobsGantt } from '@/features/scheduling/components/ScheduleJobsGantt'
import { ScheduleJobsToolbar } from '@/features/scheduling/components/ScheduleJobsToolbar'
import { useScheduleDayRuns, useScheduleEmployeesDay, useScheduleServiceUsersWeek } from '@/features/scheduling/hooks/useScheduling'
import {
  useAllocateJob,
  useUnallocateJob,
  useUpdateScheduledJob,
} from '@/features/scheduling/hooks/useSchedulingMutations'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  rowsEqual,
  scheduleTimesChanged,
  type JobDropPayload,
} from '@/features/scheduling/utils/schedule-jobs-drag.util'
import { mergeScheduleJobsEmployeeRoster } from '@/features/scheduling/utils/schedule-jobs-employee-roster.util'
import {
  mergedExcessWeeklyContractedJobIds,
  scheduleWeekStartIso,
  summarizeWeeklyContractUsage,
} from '@/features/scheduling/utils/schedule-jobs-contracted-hours.util'
import { useVisitPlanContractByServiceUser } from '@/features/service-users/visit-plan/hooks'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { formatVisitPlanWeeklyHours, visitPlanWeeklyPlannedMinutes } from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import {
  allocationWarningsSummary,
  warningsFromAllocateError,
} from '@/features/scheduling/utils/allocate-job-warnings.util'
import { scheduleTimesFitCarerDayPattern } from '@/features/scheduling/utils/schedule-jobs-availability.util'
import {
  buildScheduleJobsBoard,
  jobRequiredCarerMinutes,
  shiftIsoDate,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { activeJobAllocationCount } from '@/features/scheduling/utils/scheduling-format'
import { todayIso } from '@/features/scheduling/utils/scheduling-format'

type GroupBy = 'none' | 'area'

export default function ScheduleJobsPage() {
  const hasApi = !!getApiBaseUrl()
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { date?: string }
  const [date, setDate] = React.useState(search.date ?? todayIso())
  const [groupBy, setGroupBy] = React.useState<GroupBy>('none')
  const [allocateJobId, setAllocateJobId] = React.useState<string | null>(null)
  const [allocateOpen, setAllocateOpen] = React.useState(false)
  const [savingJobId, setSavingJobId] = React.useState<string | null>(null)

  const updateJob = useUpdateScheduledJob()
  const allocate = useAllocateJob()
  const unallocate = useUnallocateJob()

  const setScheduleDate = React.useCallback(
    (next: string) => {
      setDate(next)
      void navigate({ to: '/scheduling/schedule-jobs', search: { date: next } })
    },
    [navigate],
  )

  React.useEffect(() => {
    if (search.date) setDate(search.date)
  }, [search.date])

  const employeesQuery = useScheduleEmployeesDay(date, hasApi)
  const dayRunsQuery = useScheduleDayRuns(date, hasApi, { limit: 300 })
  const weekStart = scheduleWeekStartIso(date)
  const weekTimelineQuery = useScheduleServiceUsersWeek(weekStart, hasApi)
  const employeeCatalogQuery = useQuery({
    queryKey: employeeKeys.allList({}),
    queryFn: () => listAllEmployees({}),
    enabled: hasApi,
    staleTime: 60_000,
  })

  const isLoading =
    employeesQuery.isLoading ||
    dayRunsQuery.isLoading ||
    employeeCatalogQuery.isLoading ||
    weekTimelineQuery.isLoading
  const employeesError = employeesQuery.isError || employeeCatalogQuery.isError
  const dayRunsError = dayRunsQuery.isError

  const runJobs = dayRunsQuery.data?.runs.flatMap((run) => run.jobs) ?? []
  const runlessJobs = dayRunsQuery.data?.unassignedJobs ?? []

  const employees = React.useMemo(
    () =>
      mergeScheduleJobsEmployeeRoster(
        employeesQuery.data?.employees ?? [],
        employeeCatalogQuery.data ?? [],
        [...runJobs, ...runlessJobs],
      ),
    [employeesQuery.data?.employees, employeeCatalogQuery.data, runJobs, runlessJobs],
  )

  const board = React.useMemo(
    () => buildScheduleJobsBoard(employees, runJobs, runlessJobs),
    [employees, runJobs, runlessJobs],
  )

  const { employeeRows, carers, unassignedJobs, allJobs } = board

  const employeeRowById = React.useMemo(
    () => new Map(employeeRows.map((row) => [row.employee.id, row])),
    [employeeRows],
  )

  const serviceUserIds = React.useMemo(() => {
    const weekSuIds =
      weekTimelineQuery.data?.serviceUsers.map((row) => row.serviceUser.id) ?? []
    const daySuIds = allJobs.map((job) => job.serviceUserId)
    return [...new Set([...daySuIds, ...weekSuIds].filter(Boolean))]
  }, [allJobs, weekTimelineQuery.data])
  const visitPlanContractByServiceUser = useVisitPlanContractByServiceUser(serviceUserIds)
  const contractedHoursByServiceUser = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const [serviceUserId, context] of visitPlanContractByServiceUser) {
      if (context.contractedHours != null) map.set(serviceUserId, context.contractedHours)
    }
    return map
  }, [visitPlanContractByServiceUser])
  const visitPlanSlotsByServiceUser = React.useMemo(() => {
    const map = new Map<string, VisitPlanSlot[]>()
    for (const [serviceUserId, context] of visitPlanContractByServiceUser) {
      if (context.slots.length > 0) map.set(serviceUserId, context.slots)
    }
    return map
  }, [visitPlanContractByServiceUser])
  const weekJobs = React.useMemo(
    () => weekTimelineQuery.data?.serviceUsers.flatMap((row) => row.jobs) ?? [],
    [weekTimelineQuery.data],
  )
  const excessContractedJobIds = React.useMemo(
    () =>
      mergedExcessWeeklyContractedJobIds(
        weekJobs,
        contractedHoursByServiceUser,
        visitPlanSlotsByServiceUser,
        weekStart,
        date,
      ),
    [
      weekJobs,
      contractedHoursByServiceUser,
      visitPlanSlotsByServiceUser,
      weekStart,
      date,
    ],
  )
  const callPatternOverContract = React.useMemo(() => {
    return [...visitPlanContractByServiceUser.entries()]
      .map(([serviceUserId, context]) => {
        const plannedMinutes = visitPlanWeeklyPlannedMinutes(context.slots, { anchorIso: date })
        const contractedHours = context.contractedHours
        if (contractedHours == null || contractedHours <= 0) return null
        const contractedMinutes = Math.round(contractedHours * 60)
        if (plannedMinutes <= contractedMinutes) return null
        return {
          serviceUserId,
          plannedMinutes,
          contractedHours,
          excessMinutes: plannedMinutes - contractedMinutes,
        }
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
  }, [visitPlanContractByServiceUser, date])
  const excessContractedOnDay = React.useMemo(
    () => allJobs.filter((job) => excessContractedJobIds.has(job.id)).length,
    [allJobs, excessContractedJobIds],
  )
  const weeklyContractSummary = React.useMemo(
    () => summarizeWeeklyContractUsage(weekJobs, contractedHoursByServiceUser),
    [weekJobs, contractedHoursByServiceUser],
  )

  const requiredMinutes = allJobs.reduce((sum, job) => sum + jobRequiredCarerMinutes(job), 0)
  const bookedMinutes = carers.reduce((sum, row) => sum + row.totalMinutes, 0)
  const overBookedMinutes = Math.max(0, bookedMinutes - requiredMinutes)
  const overAllocatedJobIds = React.useMemo(
    () =>
      new Set(
        allJobs
          .filter((job) => activeJobAllocationCount(job) > job.requiredCarers)
          .map((job) => job.id),
      ),
    [allJobs],
  )
  const carersWorking = carers.length

  const allocateJob = allocateJobId ? allJobs.find((j) => j.id === allocateJobId) ?? null : null

  const openAllocate = (job: TimelineJob) => {
    setAllocateJobId(job.id)
    setAllocateOpen(true)
  }

  const handleRefresh = () => {
    void Promise.all([
      employeesQuery.refetch(),
      dayRunsQuery.refetch(),
      employeeCatalogQuery.refetch(),
      weekTimelineQuery.refetch(),
    ])
  }

  const handleJobDrop = React.useCallback(
    async (payload: JobDropPayload) => {
      const { job, sourceRow, targetRow, scheduledStartDateTime, scheduledEndDateTime } = payload
      const timesChanged = scheduleTimesChanged(job, { scheduledStartDateTime, scheduledEndDateTime })
      const rowChanged = !rowsEqual(sourceRow, targetRow)
      if (!timesChanged && !rowChanged) return

      setSavingJobId(job.id)
      try {
        if (targetRow.kind === 'carer') {
          const dayPattern = employeeRowById.get(targetRow.employeeId)?.dayPattern
          const hoursCheck = scheduleTimesFitCarerDayPattern(
            dayPattern,
            scheduledStartDateTime,
            scheduledEndDateTime,
          )
          if (!hoursCheck.ok) {
            toastWarning('Outside working hours', hoursCheck.message)
            await Promise.all([employeesQuery.refetch(), dayRunsQuery.refetch()])
            return
          }
        }

        if (timesChanged) {
          await updateJob.mutateAsync({
            jobId: job.id,
            scheduledStartDateTime,
            scheduledEndDateTime,
          })
        }

        const sourceCarerId = sourceRow.kind === 'carer' ? sourceRow.employeeId : null
        const targetCarerId = targetRow.kind === 'carer' ? targetRow.employeeId : null

        if (targetCarerId && targetCarerId !== sourceCarerId) {
          if (sourceCarerId) {
            await unallocate.mutateAsync({ jobId: job.id, employeeId: sourceCarerId })
          }
          try {
            await allocate.mutateAsync({ jobId: job.id, employeeId: targetCarerId, force: false })
          } catch (allocateError) {
            const warnings = warningsFromAllocateError(allocateError)
            if (warnings.length > 0) {
              toastWarning(
                'Carer not assigned',
                allocationWarningsSummary(warnings) ||
                  'This carer is already booked at this time. Open the job to assign anyway.',
              )
              if (sourceCarerId) {
                await allocate.mutateAsync({
                  jobId: job.id,
                  employeeId: sourceCarerId,
                  force: true,
                })
              }
              await Promise.all([employeesQuery.refetch(), dayRunsQuery.refetch()])
              return
            }
            throw allocateError
          }
        } else if (!targetCarerId && sourceCarerId) {
          await unallocate.mutateAsync({ jobId: job.id, employeeId: sourceCarerId })
        }

        toastSuccess('Schedule updated')
        await Promise.all([employeesQuery.refetch(), dayRunsQuery.refetch()])
      } catch (error) {
        toastApiError(error, 'Could not update schedule')
        await Promise.all([employeesQuery.refetch(), dayRunsQuery.refetch()])
      } finally {
        setSavingJobId(null)
      }
    },
    [allocate, dayRunsQuery, employeeRowById, employeesQuery, unallocate, updateJob],
  )

  if (!hasApi) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL to load the schedule.</div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-4 md:p-5">
      <PageHeader
        title="Schedule Jobs"
        description="Daily rota board — drag jobs to reschedule or reassign carers."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Scheduling', href: '/scheduling/view' },
          { label: 'Schedule Jobs' },
        ]}
        className="shrink-0"
      />

      <ScheduleJobsToolbar
        date={date}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        onPrevDay={() => setScheduleDate(shiftIsoDate(date, -1))}
        onNextDay={() => setScheduleDate(shiftIsoDate(date, 1))}
        onToday={() => setScheduleDate(todayIso())}
        onDateChange={setScheduleDate}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        hasError={employeesError || dayRunsError}
        requiredMinutes={requiredMinutes}
        bookedMinutes={bookedMinutes}
        overBookedMinutes={overBookedMinutes}
        carersOnBoard={employeeRows.length}
        carersWorking={carersWorking}
        unassignedCount={unassignedJobs.length}
        excessContractedCount={excessContractedOnDay}
        weeklyContractedMinutes={weeklyContractSummary.contractedMinutes}
        weeklyBookedVisitMinutes={weeklyContractSummary.bookedVisitMinutes}
        weeklyExcessContractMinutes={weeklyContractSummary.excessVisitMinutes}
      />

      {groupBy === 'area' ? (
        <p className={cn('mb-2 shrink-0 text-xs italic text-muted-foreground')}>
          Area grouping coming soon — showing all carers.
        </p>
      ) : null}

      {callPatternOverContract.length > 0 ? (
        <div className="mb-3 shrink-0 rounded-lg border border-amber-300 bg-amber-50/90 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-medium text-amber-950 dark:text-amber-50">
                Call pattern exceeds weekly contracted hours
              </p>
              {callPatternOverContract.map((row) => {
                const suName =
                  allJobs.find((job) => job.serviceUserId === row.serviceUserId)?.serviceUser ??
                  weekJobs.find((job) => job.serviceUserId === row.serviceUserId)?.serviceUser
                const label = suName
                  ? [suName.firstName, suName.lastName].filter(Boolean).join(' ').trim()
                  : 'Service user'
                return (
                  <p key={row.serviceUserId} className="text-xs text-amber-900 dark:text-amber-100">
                    <strong className="font-semibold">{label}</strong>: call pattern plans{' '}
                    {formatVisitPlanWeeklyHours(row.plannedMinutes)}/week but contract is{' '}
                    {row.contractedHours}h ({formatVisitPlanWeeklyHours(row.excessMinutes)} over). Jobs
                    beyond the contract show <strong className="font-semibold">amber stripes</strong> on
                    the board — the rota is not blocked automatically.
                  </p>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      <p className="mb-3 shrink-0 text-xs text-muted-foreground">
        Jobs come from generated rota. After changing call pattern on a visit plan, save the plan and use{' '}
        <strong className="font-medium text-foreground">Generate rota</strong> — then refresh this board.
      </p>

      <div className="min-h-0 flex-1">
        <ScheduleJobsGantt
          date={date}
          employeeRows={employeeRows}
          unassignedJobs={unassignedJobs}
          savingJobId={savingJobId}
          excessContractedJobIds={excessContractedJobIds}
          overAllocatedJobIds={overAllocatedJobIds}
          onJobClick={openAllocate}
          onJobDrop={handleJobDrop}
        />
      </div>

      <ScheduleJobAllocateDialog
        open={allocateOpen}
        onOpenChange={(open) => {
          setAllocateOpen(open)
          if (!open) setAllocateJobId(null)
        }}
        job={allocateJob}
        onAllocated={() => {
          void employeesQuery.refetch()
          void dayRunsQuery.refetch()
          void employeeCatalogQuery.refetch()
        }}
      />
    </div>
  )
}
