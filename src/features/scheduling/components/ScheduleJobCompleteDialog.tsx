import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, Loader2 } from 'lucide-react'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { fetchAcceptedCarePlans } from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import { useCompleteHousekeepingJob } from '@/features/scheduling/hooks/useSchedulingMutations'
import { ScheduleJobCompleteCarerSection } from '@/features/scheduling/components/ScheduleJobCompleteCarerSection'
import { ScheduleJobDeliveredCarePlans } from '@/features/scheduling/components/ScheduleJobDeliveredCarePlans'
import { VisitJobTasksChecklist } from '@/features/scheduling/components/VisitJobTasksChecklist'
import { VisitJobExtraTaskPicker } from '@/features/scheduling/components/VisitJobExtraTaskPicker'
import { fetchVisitJobTasks, saveVisitJobTasks } from '@/features/scheduling/api/scheduling.api'
import { fetchTaskCatalogue } from '@/features/service-users/visit-tasks/api'
import type { VisitJobTaskRow } from '@/features/scheduling/types/visit-job-tasks.types'
import { validateVisitJobTasks } from '@/features/scheduling/types/visit-job-tasks.types'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { formatMedicationRoundWindow } from '@/features/service-users/medication/medication-time-slots'
import {
  carePlanOptionsForScheduleJob,
  defaultDeliveredCarePlanIds,
} from '@/features/scheduling/utils/schedule-job-complete-care-plans.util'
import {
  formatJobTimeRange,
  jobNeedsCarerAssignment,
  serviceUserLabel,
} from '@/features/scheduling/utils/scheduling-format'
import { timelineJobLinkedCarePlanIds } from '@/features/scheduling/utils/scheduling-visit-plan.util'
import { jobDurationMinutes } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  buildJobScheduleDateTimes,
  isoToLocalTimeInput,
  jobScheduleDateIso,
} from '@/features/scheduling/utils/schedule-jobs-drag.util'
import {
  defaultScheduleJobVisitOutcome,
  SCHEDULE_JOB_VISIT_OUTCOME_OPTIONS,
  scheduleJobVisitOutcomeRequiresCarePlans,
  scheduleJobVisitOutcomeRequiresTimes,
  scheduleJobVisitOutcomeSaveLabel,
  scheduleJobVisitOutcomeShowsVisitTasks,
} from '@/features/scheduling/utils/schedule-job-visit-outcome.util'
import { assessVisitDeliveryFromJobLike } from '@/features/scheduling/utils/visit-delivery-assessment.util'
import {
  VISIT_TIMING_EXCEPTION_REASONS,
  type VisitTimingExceptionReasonCode,
} from '@/features/scheduling/utils/visit-timing-exception-reason.util'
import type { VisitPlanCalendarOutcomeStatus } from '@/features/service-users/visit-plan/visit-plan-calendar-outcome.constants'

/** Re-enable when care-plan delivery checkboxes return to Record visit. */
const SHOW_DELIVERED_CARE_PLANS = false

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: TimelineJob | null
  onCompleted?: () => void
  onJobUpdated?: () => void
}

export function ScheduleJobCompleteDialog({
  open,
  onOpenChange,
  job,
  onCompleted,
  onJobUpdated,
}: Props) {
  const completeJob = useCompleteHousekeepingJob()
  const [notes, setNotes] = React.useState('')
  const [deliveredIds, setDeliveredIds] = React.useState<string[]>([])
  const [visitStatus, setVisitStatus] = React.useState<VisitPlanCalendarOutcomeStatus>('COMPLETED')
  const [actualStartTime, setActualStartTime] = React.useState('')
  const [actualEndTime, setActualEndTime] = React.useState('')
  const [carerActualTimes, setCarerActualTimes] = React.useState<
    Array<{ allocationId: string; employeeId: string; startHm: string; endHm: string }>
  >([])
  const [overrunReason, setOverrunReason] = React.useState('')
  const [timingExceptionReasonCode, setTimingExceptionReasonCode] = React.useState<
    VisitTimingExceptionReasonCode | ''
  >('')
  const [timingExceptionNotes, setTimingExceptionNotes] = React.useState('')
  const [visitTasks, setVisitTasks] = React.useState<VisitJobTaskRow[]>([])

  const visitTasksQuery = useQuery({
    queryKey: job ? ['visit-job-tasks', job.id] : ['visit-job-tasks', 'none'],
    queryFn: () => fetchVisitJobTasks(job!.id),
    enabled: open && Boolean(job?.id),
    staleTime: 15_000,
  })

  const taskCatalogueQuery = useQuery({
    queryKey: ['task-catalogue'],
    queryFn: fetchTaskCatalogue,
    enabled: open,
    staleTime: 60_000,
  })

  const acceptedQuery = useQuery({
    queryKey: job
      ? initialAssessmentKeys.acceptedCarePlans(job.serviceUserId)
      : ['schedule-job-complete', 'no-su'],
    queryFn: () => fetchAcceptedCarePlans(job!.serviceUserId),
    enabled: SHOW_DELIVERED_CARE_PLANS && open && Boolean(job?.serviceUserId),
    staleTime: 30_000,
  })

  const carePlanOptions = React.useMemo(() => {
    if (!job) return []
    return carePlanOptionsForScheduleJob(
      acceptedQuery.data?.items ?? [],
      timelineJobLinkedCarePlanIds(job),
    )
  }, [acceptedQuery.data?.items, job])

  const scheduleDateIso = job ? jobScheduleDateIso(job) : ''
  const multiCarerTiming =
    Boolean(job) &&
    ((job!.requiredCarers ?? 0) > 1 || (job!.allocations?.length ?? 0) > 1)

  const actualDateTimes = React.useMemo(() => {
    if (!scheduleDateIso) return null
    if (multiCarerTiming && carerActualTimes.length > 0) {
      const windows = carerActualTimes
        .map((row) => buildJobScheduleDateTimes(scheduleDateIso, row.startHm, row.endHm))
        .filter(Boolean)
      if (!windows.length) return null
      const starts = windows.map((w) => new Date(w.scheduledStartDateTime).getTime())
      const ends = windows.map((w) => new Date(w.scheduledEndDateTime).getTime())
      return {
        scheduledStartDateTime: new Date(Math.min(...starts)).toISOString(),
        scheduledEndDateTime: new Date(Math.max(...ends)).toISOString(),
      }
    }
    return buildJobScheduleDateTimes(scheduleDateIso, actualStartTime, actualEndTime)
  }, [actualEndTime, actualStartTime, carerActualTimes, multiCarerTiming, scheduleDateIso])

  const actualDurationMinutes = React.useMemo(() => {
    if (!actualDateTimes) return null
    const start = new Date(actualDateTimes.scheduledStartDateTime)
    const end = new Date(actualDateTimes.scheduledEndDateTime)
    return Math.round((end.getTime() - start.getTime()) / 60_000)
  }, [actualDateTimes])

  React.useEffect(() => {
    if (!visitTasksQuery.data) return
    setVisitTasks(visitTasksQuery.data.tasks)
  }, [visitTasksQuery.data])

  React.useEffect(() => {
    if (!open || !job) return
    setNotes(job.notes?.trim() ?? '')
    setDeliveredIds([])
    setVisitTasks([])
    setOverrunReason('')
    setTimingExceptionReasonCode('')
    setTimingExceptionNotes('')
    setVisitStatus(defaultScheduleJobVisitOutcome(job))
    setActualStartTime(
      isoToLocalTimeInput(job.actualStartDateTime) || isoToLocalTimeInput(job.scheduledStartDateTime),
    )
    setActualEndTime(
      isoToLocalTimeInput(job.actualEndDateTime) ||
        isoToLocalTimeInput(job.scheduledEndDateTime) ||
        isoToLocalTimeInput(
          new Date(
            new Date(job.scheduledStartDateTime).getTime() + jobDurationMinutes(job) * 60_000,
          ).toISOString(),
        ),
    )
    const visitStart = isoToLocalTimeInput(job.scheduledStartDateTime)
    const visitEnd =
      isoToLocalTimeInput(job.scheduledEndDateTime) ||
      isoToLocalTimeInput(
        new Date(
          new Date(job.scheduledStartDateTime).getTime() + jobDurationMinutes(job) * 60_000,
        ).toISOString(),
      )
    setCarerActualTimes(
      (job.allocations ?? []).map((a) => {
        const plannedStart =
          isoToLocalTimeInput(a.resolvedStartDateTime ?? a.scheduledStartDateTime ?? undefined) ||
          visitStart
        const plannedEnd =
          isoToLocalTimeInput(a.resolvedEndDateTime ?? a.scheduledEndDateTime ?? undefined) ||
          visitEnd
        return {
          allocationId: a.id,
          employeeId: a.employeeId,
          startHm:
            isoToLocalTimeInput(a.actualStartDateTime ?? undefined) ||
            plannedStart,
          endHm:
            isoToLocalTimeInput(a.actualEndDateTime ?? undefined) || plannedEnd,
        }
      }),
    )
  }, [open, job?.id, job?.actualEndDateTime, job?.actualStartDateTime, job?.scheduledEndDateTime, job?.scheduledStartDateTime, job?.status, job?.visits, job?.allocations])

  React.useEffect(() => {
    if (!SHOW_DELIVERED_CARE_PLANS || !open || !job || acceptedQuery.isLoading) return
    setDeliveredIds(defaultDeliveredCarePlanIds(job, carePlanOptions))
  }, [open, job, acceptedQuery.isLoading, carePlanOptions])

  const requiresTimes = scheduleJobVisitOutcomeRequiresTimes(visitStatus)
  const requiresCarePlans = SHOW_DELIVERED_CARE_PLANS && scheduleJobVisitOutcomeRequiresCarePlans(visitStatus)
  const showsVisitTasks = scheduleJobVisitOutcomeShowsVisitTasks(visitStatus)
  const saveLabel = scheduleJobVisitOutcomeSaveLabel(visitStatus)

  const plannedDurationMinutes = job ? jobDurationMinutes(job) : null
  const overrunMinutes =
    actualDurationMinutes != null &&
    plannedDurationMinutes != null &&
    actualDurationMinutes > plannedDurationMinutes
      ? actualDurationMinutes - plannedDurationMinutes
      : 0
  const hasOverrun = requiresTimes && overrunMinutes > 0

  const liveDeliveryAssessment = React.useMemo(() => {
    if (!job || !requiresTimes || !actualDateTimes) return null
    return assessVisitDeliveryFromJobLike({
      status: visitStatus,
      requiredCarers: job.requiredCarers,
      allocatedCarers: job.allocatedCarers,
      allocations: job.allocations,
      scheduledStartDateTime: job.scheduledStartDateTime,
      scheduledEndDateTime: job.scheduledEndDateTime,
      actualStartDateTime: actualDateTimes.scheduledStartDateTime,
      actualEndDateTime: actualDateTimes.scheduledEndDateTime,
      visitPlan: job.visitPlan,
      visits: job.visits,
    })
  }, [actualDateTimes, job, requiresTimes, visitStatus])

  const requiresTimingExceptionReason = Boolean(liveDeliveryAssessment?.requiresExceptionReason)

  const visitTasksRoundLabel = visitTasksQuery.data?.roundLabel
  const visitTasksRoundWindow =
    visitTasksQuery.data?.windowStart && visitTasksQuery.data?.windowEnd
      ? `${visitTasksQuery.data.windowStart} – ${visitTasksQuery.data.windowEnd}`
      : visitTasksQuery.data?.medicationRoundCode
        ? formatMedicationRoundWindow({
            id: visitTasksQuery.data.medicationRoundCode,
            name: visitTasksRoundLabel ?? visitTasksQuery.data.medicationRoundCode,
            code: visitTasksQuery.data.medicationRoundCode,
            windowStart: visitTasksQuery.data.windowStart,
            windowEnd: visitTasksQuery.data.windowEnd,
          })
        : null

  const updateVisitTask = (
    assignmentId: string,
    patch: {
      isCompleted?: boolean
      recordedValue?: string | null
      notes?: string | null
    },
  ) => {
    setVisitTasks((prev) =>
      prev.map((task) => (task.assignmentId === assignmentId ? { ...task, ...patch } : task)),
    )
  }

  const removeExtraVisitTask = (assignmentId: string) => {
    setVisitTasks((prev) => prev.filter((task) => task.assignmentId !== assignmentId))
  }

  const addExtraVisitTask = (task: VisitJobTaskRow) => {
    setVisitTasks((prev) => {
      if (prev.some((row) => row.taskCatalogueTaskId === task.taskCatalogueTaskId)) return prev
      return [...prev, task]
    })
  }

  const mapVisitTasksForSave = (tasks: VisitJobTaskRow[]) =>
    tasks.map((task) =>
      task.isExtra
        ? {
            taskCatalogueTaskId: task.taskCatalogueTaskId,
            isExtra: true,
            isCompleted: task.isCompleted,
            recordedValue: task.recordedValue ?? undefined,
            notes: task.notes ?? undefined,
          }
        : {
            assignmentId: task.assignmentId,
            isCompleted: task.isCompleted,
            recordedValue: task.recordedValue ?? undefined,
            notes: task.notes ?? undefined,
          },
    )

  const actualStartDateTime = React.useMemo(() => {
    if (!scheduleDateIso || !actualStartTime || !/^\d{2}:\d{2}$/.test(actualStartTime)) return undefined
    const start = new Date(`${scheduleDateIso}T${actualStartTime}:00.000Z`)
    return Number.isNaN(start.getTime()) ? undefined : start.toISOString()
  }, [actualStartTime, scheduleDateIso])

  const handleComplete = async () => {
    if (!job) return
    if (jobNeedsCarerAssignment(job)) {
      toastWarning(
        'Assign carers first',
        `Allocate ${job.requiredCarers} carer${job.requiredCarers === 1 ? '' : 's'} before recording this visit.`,
      )
      return
    }
    if (requiresTimes && multiCarerTiming) {
      const invalid = carerActualTimes.some(
        (row) => !row.startHm || !row.endHm || row.endHm <= row.startHm,
      )
      if (invalid || !actualDateTimes) {
        toastWarning(
          'Enter carer times',
          'Each assigned carer needs a valid actual start and end time.',
        )
        return
      }
    } else if (requiresTimes && (!actualStartTime || !actualEndTime || !actualDateTimes)) {
      toastWarning('Enter visit times', 'Actual start and end times are required for this visit status.')
      return
    }
    if (hasOverrun && !overrunReason.trim()) {
      toastWarning(
        'Overrun reason required',
        `Actual time is ${overrunMinutes} min longer than planned. Explain why before saving.`,
      )
      return
    }
    if (requiresTimingExceptionReason && !timingExceptionReasonCode) {
      toastWarning(
        'Exception reason required',
        'Select a structured reason for the late, early, short, or overrun exception.',
      )
      return
    }
    const selectedReason = VISIT_TIMING_EXCEPTION_REASONS.find(
      (r) => r.code === timingExceptionReasonCode,
    )
    if (selectedReason?.requiresNotes && !timingExceptionNotes.trim() && !overrunReason.trim()) {
      toastWarning('Notes required', 'Add notes when the exception reason is Other.')
      return
    }
    if (requiresCarePlans && deliveredIds.length === 0 && !notes.trim()) {
      toastWarning(
        'Select care plans',
        'Tick at least one care plan delivered on this visit, or add a note explaining why none apply.',
      )
      return
    }
    try {
      if (showsVisitTasks && visitTasksQuery.data?.medicationRoundCode && visitTasks.length > 0) {
        const taskValidationError = validateVisitJobTasks(visitTasks)
        if (taskValidationError) {
          toastWarning('Complete task details', taskValidationError)
          return
        }
        await saveVisitJobTasks(job.id, mapVisitTasksForSave(visitTasks))
      }

      await completeJob.mutateAsync({
        jobId: job.id,
        status: visitStatus,
        notes: notes.trim() || undefined,
        deliveredCarePlanFormIds: requiresCarePlans ? deliveredIds : undefined,
        actualStartDateTime: actualDateTimes?.scheduledStartDateTime ?? actualStartDateTime,
        actualEndDateTime: actualDateTimes?.scheduledEndDateTime,
        carerActuals:
          multiCarerTiming && scheduleDateIso
            ? carerActualTimes.map((row) => {
                const window = buildJobScheduleDateTimes(
                  scheduleDateIso,
                  row.startHm,
                  row.endHm,
                )
                return {
                  allocationId: row.allocationId,
                  actualStartDateTime: window.scheduledStartDateTime,
                  actualEndDateTime: window.scheduledEndDateTime,
                }
              })
            : undefined,
        overrunReason: hasOverrun ? overrunReason.trim() : undefined,
        timingExceptionReasonCode: requiresTimingExceptionReason
          ? timingExceptionReasonCode || undefined
          : undefined,
        timingExceptionNotes:
          timingExceptionNotes.trim() ||
          (requiresTimingExceptionReason && overrunReason.trim() ? overrunReason.trim() : undefined),
      })
      toastSuccess(
        visitStatus === 'COMPLETED' ? 'Job completed' : 'Visit saved',
        SCHEDULE_JOB_VISIT_OUTCOME_OPTIONS.find((option) => option.value === visitStatus)?.label ??
          'Visit details recorded.',
      )
      onCompleted?.()
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not save visit')
    }
  }

  const visitLabel = job?.visitPlan?.label?.trim()
  const busy = completeJob.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Record visit</DialogTitle>
          <DialogDescription>
            {job ? (
              <>
                {serviceUserLabel(job.serviceUser)}
                {visitLabel ? ` · ${visitLabel}` : ''} · {formatJobTimeRange(job)}
              </>
            ) : (
              'Record visit outcome, times, and care delivered.'
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[78vh] space-y-5 overflow-y-auto pe-1">
          {job ? (
            <ScheduleJobCompleteCarerSection
              job={job}
              disabled={busy}
              onAllocated={onJobUpdated}
            />
          ) : null}

          <section className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Visit status</Label>
            <Select
              value={visitStatus}
              onValueChange={(value) => setVisitStatus(value as VisitPlanCalendarOutcomeStatus)}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_JOB_VISIT_OUTCOME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {SCHEDULE_JOB_VISIT_OUTCOME_OPTIONS.find((option) => option.value === visitStatus)
                ?.description}
            </p>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
              <h4 className="text-sm font-semibold text-foreground">
                {multiCarerTiming ? 'Actual times per carer' : 'Actual visit times'}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">
              {multiCarerTiming
                ? 'Record when each carer started and finished. Planned times come from their assignment window.'
                : visitStatus === 'STARTED'
                  ? 'Record when the visit started. End time is optional until the visit is completed.'
                  : requiresTimes
                    ? 'Record when the visit started and ended.'
                    : 'Optional — add actual times if known.'}
            </p>
            {multiCarerTiming && job ? (
              <ul className="space-y-3">
                {(job.allocations ?? []).map((allocation, index) => {
                  const draft = carerActualTimes.find((r) => r.allocationId === allocation.id)
                  if (!draft) return null
                  const name =
                    [allocation.employee?.firstName, allocation.employee?.lastName]
                      .filter(Boolean)
                      .join(' ')
                      .trim() || 'Carer'
                  const plannedStart =
                    isoToLocalTimeInput(
                      allocation.resolvedStartDateTime ??
                        allocation.scheduledStartDateTime ??
                        undefined,
                    ) || isoToLocalTimeInput(job.scheduledStartDateTime)
                  const plannedEnd =
                    isoToLocalTimeInput(
                      allocation.resolvedEndDateTime ??
                        allocation.scheduledEndDateTime ??
                        undefined,
                    ) || isoToLocalTimeInput(job.scheduledEndDateTime ?? undefined)
                  const carerWindow = buildJobScheduleDateTimes(
                    scheduleDateIso,
                    draft.startHm,
                    draft.endHm,
                  )
                  const carerMins = carerWindow
                    ? Math.round(
                        (new Date(carerWindow.scheduledEndDateTime).getTime() -
                          new Date(carerWindow.scheduledStartDateTime).getTime()) /
                          60_000,
                      )
                    : null
                  const plannedMins =
                    allocation.resolvedDurationMinutes ??
                    allocation.durationMinutes ??
                    null
                  return (
                    <li
                      key={allocation.id}
                      className="space-y-2 rounded-md border border-border bg-muted/20 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-foreground">
                        Carer {index + 1} · {name}
                        {allocation.isLeadCarer ? ' (Lead)' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Planned: {plannedStart || '—'}–{plannedEnd || '—'}
                        {plannedMins != null ? ` · ${plannedMins} min` : ''}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Actual start</Label>
                          <Input
                            type="time"
                            className="mt-1"
                            value={draft.startHm}
                            disabled={busy}
                            onChange={(event) => {
                              const value = event.target.value
                              setCarerActualTimes((rows) =>
                                rows.map((row) =>
                                  row.allocationId === allocation.id
                                    ? { ...row, startHm: value }
                                    : row,
                                ),
                              )
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Actual end</Label>
                          <Input
                            type="time"
                            className="mt-1"
                            value={draft.endHm}
                            disabled={busy}
                            onChange={(event) => {
                              const value = event.target.value
                              setCarerActualTimes((rows) =>
                                rows.map((row) =>
                                  row.allocationId === allocation.id
                                    ? { ...row, endHm: value }
                                    : row,
                                ),
                              )
                            }}
                          />
                        </div>
                      </div>
                      {carerMins != null ? (
                        <p className="text-xs text-muted-foreground">
                          Duration: {carerMins} min
                          {plannedMins != null ? ` (planned ${plannedMins} min)` : ''}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="schedule-job-actual-start" className="text-xs text-muted-foreground">
                    Start time
                  </Label>
                  <Input
                    id="schedule-job-actual-start"
                    type="time"
                    className="mt-1"
                    value={actualStartTime}
                    disabled={busy}
                    onChange={(event) => setActualStartTime(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="schedule-job-actual-end" className="text-xs text-muted-foreground">
                    End time
                  </Label>
                  <Input
                    id="schedule-job-actual-end"
                    type="time"
                    className="mt-1"
                    value={actualEndTime}
                    disabled={busy}
                    onChange={(event) => setActualEndTime(event.target.value)}
                  />
                </div>
              </div>
            )}
            {actualDurationMinutes != null ? (
              <p className="text-xs text-muted-foreground">
                {multiCarerTiming ? 'Visit window duration' : 'Duration'}: {actualDurationMinutes}{' '}
                min
                {plannedDurationMinutes != null ? ` (planned ${plannedDurationMinutes} min)` : ''}
              </p>
            ) : requiresTimes && !multiCarerTiming ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Enter a valid start and end time (minimum 5 minutes).
              </p>
            ) : null}
            {hasOverrun ? (
              <div className="space-y-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 dark:border-amber-700/50 dark:bg-amber-950/30">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                  {overrunMinutes} min overrun — reason required for admin approval
                </p>
                <Label htmlFor="schedule-job-overrun-reason" className="text-xs text-muted-foreground">
                  Why did this visit run longer than planned?
                </Label>
                <textarea
                  id="schedule-job-overrun-reason"
                  className="min-h-[72px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={overrunReason}
                  disabled={busy}
                  onChange={event => setOverrunReason(event.target.value)}
                  placeholder="e.g. Service user needed extra support with medication"
                  maxLength={2000}
                />
              </div>
            ) : null}
            {requiresTimingExceptionReason && liveDeliveryAssessment ? (
              <div className="space-y-2 rounded-md border border-orange-300/60 bg-orange-50/80 px-3 py-2 dark:border-orange-700/50 dark:bg-orange-950/30">
                <p className="text-xs font-medium text-orange-950 dark:text-orange-100">
                  Timing / duration exception — structured reason required
                </p>
                <p className="text-xs text-muted-foreground">
                  {liveDeliveryAssessment.timingLabel}
                  {liveDeliveryAssessment.durationExceptions.length
                    ? ` · ${liveDeliveryAssessment.durationExceptions.join(', ').replace(/_/g, ' ')}`
                    : ''}
                </p>
                <Label className="text-xs text-muted-foreground">Exception reason</Label>
                <Select
                  value={timingExceptionReasonCode || undefined}
                  onValueChange={(value) =>
                    setTimingExceptionReasonCode(value as VisitTimingExceptionReasonCode)
                  }
                  disabled={busy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason…" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_TIMING_EXCEPTION_REASONS.map((reason) => (
                      <SelectItem key={reason.code} value={reason.code}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label
                  htmlFor="schedule-job-timing-exception-notes"
                  className="text-xs text-muted-foreground"
                >
                  Exception notes
                  {VISIT_TIMING_EXCEPTION_REASONS.find((r) => r.code === timingExceptionReasonCode)
                    ?.requiresNotes
                    ? ' (required)'
                    : ' (optional)'}
                </Label>
                <textarea
                  id="schedule-job-timing-exception-notes"
                  className="min-h-[64px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={timingExceptionNotes}
                  disabled={busy}
                  onChange={(event) => setTimingExceptionNotes(event.target.value)}
                  placeholder="Additional context for audit / commissioner evidence"
                  maxLength={2000}
                />
              </div>
            ) : null}
          </section>

          {showsVisitTasks ? (
            <section className="space-y-3">
              <div>
                <Label className="text-sm font-semibold text-foreground">Visit tasks</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Follow the priority and instructions for each task, then tick when complete.
                  Unticked tasks stay outstanding. Use &quot;Extra task&quot; for work not on the plan.
                </p>
              </div>
              <VisitJobTasksChecklist
                idPrefix="schedule-complete-visit-task"
                tasks={visitTasks}
                disabled={busy}
                loading={visitTasksQuery.isLoading}
                roundLabel={visitTasksRoundLabel}
                roundWindow={visitTasksRoundWindow}
                listMaxHeightClass="max-h-[min(32rem,55vh)]"
                noRoundMessage={
                  !visitTasksQuery.isLoading && !visitTasksQuery.data?.medicationRoundCode
                    ? 'This visit is not linked to a visit-plan time slot. Link the job to a visit plan slot to show planned tasks.'
                    : undefined
                }
                emptyMessage={
                  visitTasksQuery.data?.medicationRoundCode
                    ? `No tasks planned for ${visitTasksRoundLabel ?? 'this time slot'}. Add tasks in Tasks Planner on the service user profile, or record an extra task below.`
                    : undefined
                }
                onTaskChange={updateVisitTask}
                onRemoveExtra={removeExtraVisitTask}
              />
              {visitTasksQuery.data?.medicationRoundCode && taskCatalogueQuery.data ? (
                <VisitJobExtraTaskPicker
                  catalogue={taskCatalogueQuery.data}
                  existingTasks={visitTasks}
                  disabled={busy}
                  onAdd={addExtraVisitTask}
                />
              ) : null}
            </section>
          ) : null}

          {requiresCarePlans ? (
            <section className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Care plans delivered</Label>
              <p className="text-xs text-muted-foreground">
                Select which accepted care plans were delivered on this visit.
              </p>
              {acceptedQuery.isLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading care plans…
                </div>
              ) : (
                <ScheduleJobDeliveredCarePlans
                  options={carePlanOptions}
                  selectedIds={deliveredIds}
                  disabled={busy}
                  onChange={setDeliveredIds}
                />
              )}
            </section>
          ) : null}

          <section className="space-y-2">
            <Label htmlFor="schedule-job-complete-notes" className="text-sm font-semibold text-foreground">
              Visit notes
            </Label>
            <textarea
              id="schedule-job-complete-notes"
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={busy}
              placeholder="Tasks completed, concerns, handover notes…"
            />
          </section>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleComplete()} disabled={!job || busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              saveLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
