import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeftRight, Clock, Crown, Loader2, UserMinus, UserPlus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { listAllEmployees } from '@/features/employees/api'
import { employeeKeys } from '@/features/employees/keys'
import { employeeListRowDisplayName } from '@/features/employees/lib/employee-display-name'
import {
  useAllocateJob,
  useSetJobLeadCarer,
  useUnallocateJob,
  useUpdateScheduledJob,
} from '@/features/scheduling/hooks/useSchedulingMutations'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  activeJobAllocationCount,
  employeesLabel,
  formatJobTimeRange,
  jobNeedsCarerAssignment,
  jobStatusLabel,
  serviceUserLabel,
} from '@/features/scheduling/utils/scheduling-format'
import {
  jobAttentionReason,
  timelineJobVisitPlanSlot,
} from '@/features/scheduling/utils/scheduling-visit-plan.util'
import { ScheduleJobRecommendedCarers } from '@/features/scheduling/components/ScheduleJobRecommendedCarers'
import { jobDurationMinutes } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  buildJobScheduleDateTimes,
  isoToLocalTimeInput,
  jobScheduleDateIso,
  scheduleTimesChanged,
} from '@/features/scheduling/utils/schedule-jobs-drag.util'
import {
  warningsFromAllocateError,
  type AllocationWarning,
} from '@/features/scheduling/utils/allocate-job-warnings.util'
import type { VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'
import type { ScheduleJobAllocateDialogPanel } from '@/features/scheduling/types/schedule-job-context-actions.types'
import { isScheduleJobReadOnly } from '@/features/scheduling/types/schedule-job-context-actions.types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: TimelineJob | null
  initialPanel?: ScheduleJobAllocateDialogPanel
  onAllocated?: () => void
}

function employeeNameFromAllocation(
  allocation: TimelineJob['allocations'][number],
): string {
  const e = allocation.employee
  if (!e) return 'Unknown employee'
  return [e.firstName, e.lastName].filter(Boolean).join(' ') || 'Unknown employee'
}

export function ScheduleJobAllocateDialog({
  open,
  onOpenChange,
  job,
  initialPanel = 'allocate',
  onAllocated,
}: Props) {
  const timePanelRef = React.useRef<HTMLElement>(null)
  const assignedPanelRef = React.useRef<HTMLElement>(null)
  const [search, setSearch] = React.useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null)
  const [replacingEmployeeId, setReplacingEmployeeId] = React.useState<string | null>(null)
  const [pendingWarnings, setPendingWarnings] = React.useState<AllocationWarning[]>([])
  const [pendingEmployeeId, setPendingEmployeeId] = React.useState<string | null>(null)
  const [allocatingEmployeeId, setAllocatingEmployeeId] = React.useState<string | null>(null)
  const [startTime, setStartTime] = React.useState('')
  const [endTime, setEndTime] = React.useState('')
  const [savingTimes, setSavingTimes] = React.useState(false)
  const [suggestCandidates, setSuggestCandidates] = React.useState<VisitPlanCarerCandidate[]>([])
  const [assignAsLead, setAssignAsLead] = React.useState(false)

  const allocate = useAllocateJob()
  const setLeadCarer = useSetJobLeadCarer()
  const unallocate = useUnallocateJob()
  const updateJob = useUpdateScheduledJob()

  const employeesQuery = useQuery({
    queryKey: employeeKeys.allList({}),
    queryFn: () => listAllEmployees({}),
    enabled: open,
    staleTime: 60_000,
  })

  React.useEffect(() => {
    if (!open) {
      setSearch('')
      setSuggestCandidates([])
      setSelectedEmployeeId(null)
      setReplacingEmployeeId(null)
      setPendingWarnings([])
      setPendingEmployeeId(null)
      setAllocatingEmployeeId(null)
      setStartTime('')
      setEndTime('')
      setSavingTimes(false)
      setAssignAsLead(false)
    }
  }, [open])

  React.useEffect(() => {
    if (!open || !job) return
    setStartTime(isoToLocalTimeInput(job.scheduledStartDateTime))
    setEndTime(
      isoToLocalTimeInput(job.scheduledEndDateTime) ||
        isoToLocalTimeInput(
          new Date(
            new Date(job.scheduledStartDateTime).getTime() + jobDurationMinutes(job) * 60_000,
          ).toISOString(),
        ),
    )
  }, [open, job?.id, job?.scheduledStartDateTime, job?.scheduledEndDateTime])

  React.useEffect(() => {
    if (!open || !job) return
    const target = initialPanel === 'time' ? timePanelRef.current : assignedPanelRef.current
    if (!target) return
    const timer = window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (initialPanel === 'time') {
        const input = target.querySelector<HTMLInputElement>('input[type="time"]')
        input?.focus()
      }
    }, 50)
    return () => window.clearTimeout(timer)
  }, [open, job?.id, initialPanel])

  const allocatedCount = job ? activeJobAllocationCount(job) : 0
  const slotsRemaining = job ? Math.max(0, job.requiredCarers - allocatedCount) : 0
  const needsMoreCarers = job ? jobNeedsCarerAssignment(job) : false
  const multiCarerJob = (job?.requiredCarers ?? 0) > 1
  const attention = job ? jobAttentionReason(job) : null
  const visitId = job?.visits?.[0]?.id
  const allocatedEmployeeIds = new Set((job?.allocations ?? []).map((a) => a.employeeId))
  const replacingName = replacingEmployeeId
    ? (job?.allocations ?? []).find((a) => a.employeeId === replacingEmployeeId)
    : null

  const rotaBookedEmployeeIds = React.useMemo(
    () =>
      new Set(
        suggestCandidates.filter((c) => c.hasRotaConflict).map((candidate) => candidate.employeeId),
      ),
    [suggestCandidates],
  )

  const filteredEmployees = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return (employeesQuery.data ?? [])
      .filter((row) => {
        if (replacingEmployeeId) return row.id !== replacingEmployeeId
        return !allocatedEmployeeIds.has(row.id)
      })
      .filter((row) => !rotaBookedEmployeeIds.has(row.id))
      .filter((row) => {
        if (!q) return true
        const name = employeeListRowDisplayName(row).toLowerCase()
        return name.includes(q) || row.id.toLowerCase().includes(q)
      })
      .slice(0, 40)
  }, [
    employeesQuery.data,
    allocatedEmployeeIds,
    replacingEmployeeId,
    rotaBookedEmployeeIds,
    search,
  ])

  const runAllocate = async (employeeId: string, force = false, isLeadCarer?: boolean) => {
    if (!job) return
    setAllocatingEmployeeId(employeeId)
    try {
      const result = await allocate.mutateAsync({
        jobId: job.id,
        employeeId,
        scheduledVisitId: visitId,
        force,
        isLeadCarer: multiCarerJob ? isLeadCarer ?? assignAsLead : undefined,
      })
      setPendingWarnings([])
      setPendingEmployeeId(null)
      setSelectedEmployeeId(null)
      setReplacingEmployeeId(null)
      setAssignAsLead(false)
      if (result.data.status === 'PENDING_CONFIRMATION') {
        toastWarning('Confirmation required', result.message)
      } else {
        toastSuccess('Carer allocated', result.message)
      }
      onAllocated?.()
    } catch (e) {
      const warnings = warningsFromAllocateError(e)
      if (warnings.length > 0) {
        setPendingWarnings(warnings)
        setPendingEmployeeId(employeeId)
        return
      }
      toastApiError(e, 'Could not allocate carer')
    } finally {
      setAllocatingEmployeeId(null)
    }
  }

  const runReplace = async (newEmployeeId: string, oldEmployeeId: string, force = false) => {
    if (!job) return
    const replacingWasLead =
      multiCarerJob &&
      (job.allocations ?? []).some((a) => a.employeeId === oldEmployeeId && a.isLeadCarer)
    setAllocatingEmployeeId(newEmployeeId)
    try {
      await unallocate.mutateAsync({ jobId: job.id, employeeId: oldEmployeeId })
      const result = await allocate.mutateAsync({
        jobId: job.id,
        employeeId: newEmployeeId,
        scheduledVisitId: visitId,
        force,
        isLeadCarer: replacingWasLead || assignAsLead ? true : undefined,
      })
      setPendingWarnings([])
      setPendingEmployeeId(null)
      setSelectedEmployeeId(null)
      setReplacingEmployeeId(null)
      setAssignAsLead(false)
      if (result.data.status === 'PENDING_CONFIRMATION') {
        toastWarning('Confirmation required', result.message)
      } else {
        toastSuccess('Carer changed', 'The job has been reassigned.')
      }
      onAllocated?.()
    } catch (e) {
      const warnings = warningsFromAllocateError(e)
      if (warnings.length > 0) {
        setPendingWarnings(warnings)
        setPendingEmployeeId(newEmployeeId)
        return
      }
      toastApiError(e, 'Could not change carer')
    } finally {
      setAllocatingEmployeeId(null)
    }
  }

  const handlePickEmployee = (employeeId: string, force = false) => {
    if (replacingEmployeeId) {
      void runReplace(employeeId, replacingEmployeeId, force)
      return
    }
    void runAllocate(employeeId, force)
  }

  const handleAllocate = () => {
    if (!selectedEmployeeId) return
    handlePickEmployee(selectedEmployeeId)
  }

  const handleForceAllocate = () => {
    if (!pendingEmployeeId) return
    if (replacingEmployeeId) {
      void runReplace(pendingEmployeeId, replacingEmployeeId, true)
      return
    }
    void runAllocate(pendingEmployeeId, true)
  }

  const scheduleDateIso = job ? jobScheduleDateIso(job) : ''
  const nextScheduleTimes = React.useMemo(
    () => (scheduleDateIso ? buildJobScheduleDateTimes(scheduleDateIso, startTime, endTime) : null),
    [scheduleDateIso, startTime, endTime],
  )
  const timesChanged =
    job && nextScheduleTimes ? scheduleTimesChanged(job, nextScheduleTimes) : false
  const scheduleDurationMinutes = React.useMemo(() => {
    if (!nextScheduleTimes) return null
    const start = new Date(nextScheduleTimes.scheduledStartDateTime)
    const end = new Date(nextScheduleTimes.scheduledEndDateTime)
    return Math.round((end.getTime() - start.getTime()) / 60_000)
  }, [nextScheduleTimes])

  const handleSaveTimes = async () => {
    if (!job || !nextScheduleTimes || !timesChanged) return
    setSavingTimes(true)
    try {
      await updateJob.mutateAsync({
        jobId: job.id,
        scheduledStartDateTime: nextScheduleTimes.scheduledStartDateTime,
        scheduledEndDateTime: nextScheduleTimes.scheduledEndDateTime,
      })
      toastSuccess('Schedule updated', 'Job start and end times saved.')
      onAllocated?.()
    } catch (e) {
      toastApiError(e, 'Could not update job times')
    } finally {
      setSavingTimes(false)
    }
  }

  const handleSetLeadCarer = (employeeId: string) => {
    if (!job) return
    setLeadCarer.mutate(
      { jobId: job.id, employeeId },
      {
        onSuccess: (res) => {
          toastSuccess('Lead carer updated', res.message ?? 'Lead carer set for this visit.')
          onAllocated?.()
        },
        onError: (e) => toastApiError(e, 'Could not set lead carer'),
      },
    )
  }

  const handleUnallocate = (employeeId: string) => {
    if (!job) return
    if (replacingEmployeeId === employeeId) setReplacingEmployeeId(null)
    unallocate.mutate(
      { jobId: job.id, employeeId },
      {
        onSuccess: (res) => {
          toastSuccess('Carer removed', res.message ?? 'Allocation removed')
          onAllocated?.()
        },
        onError: (e) => toastApiError(e, 'Could not remove carer'),
      },
    )
  }

  if (!job) return null

  const readOnly = isScheduleJobReadOnly(job)
  const dialogTitle = readOnly
    ? 'View job details'
    : needsMoreCarers
      ? 'Assign carers'
      : 'Manage job carers'
  const manualSectionTitle = replacingEmployeeId
    ? 'Choose replacement manually'
    : needsMoreCarers
      ? 'Add carer manually'
      : 'Change carer manually'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {serviceUserLabel(job.serviceUser)}
            {timelineJobVisitPlanSlot(job) ? ` · ${timelineJobVisitPlanSlot(job)}` : ''} ·{' '}
            {formatJobTimeRange(job)}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="max-h-[calc(90vh-10rem)] space-y-5 overflow-y-auto">
          {readOnly ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
              This job is <strong>{jobStatusLabel(job.status)}</strong> and cannot be edited. You can
              review carers, times, and notes only.
            </div>
          ) : null}

          {readOnly && job.notes?.trim() ? (
            <section className="space-y-2 rounded-lg border border-border bg-card px-4 py-3">
              <h4 className="text-sm font-semibold text-foreground">Notes</h4>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{job.notes.trim()}</p>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            <span>
              <strong>{allocatedCount}</strong> / {job.requiredCarers} carers assigned
            </span>
            {slotsRemaining > 0 ? (
              <span className="text-amber-800 dark:text-amber-200">
                {slotsRemaining} more required
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-300">Fully allocated</span>
            )}
            {multiCarerJob ? (
              <span className="text-muted-foreground">
                One carer is the <strong className="text-foreground">lead</strong> for this visit
              </span>
            ) : null}
          </div>

          {attention && !readOnly ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>{attention}</p>
            </div>
          ) : null}

          <section
            ref={timePanelRef}
            className="space-y-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
              <h4 className="text-sm font-semibold text-foreground">Scheduled time</h4>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="job-start-time" className="text-xs text-muted-foreground">
                  Start time
                </Label>
                <Input
                  id="job-start-time"
                  type="time"
                  className="mt-1"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div>
                <Label htmlFor="job-end-time" className="text-xs text-muted-foreground">
                  End time
                </Label>
                <Input
                  id="job-end-time"
                  type="time"
                  className="mt-1"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </div>
            {scheduleDurationMinutes != null ? (
              <p className="text-xs text-muted-foreground">
                Duration: {scheduleDurationMinutes} min
                {timesChanged ? ' · unsaved changes' : ''}
              </p>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Enter a valid start and end time (minimum 5 minutes).
              </p>
            )}
          </section>

          {replacingEmployeeId && !readOnly ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
              <p>
                Replacing{' '}
                <strong>
                  {replacingName ? employeeNameFromAllocation(replacingName) : 'selected carer'}
                </strong>{' '}
                — pick a recommended carer or search below.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplacingEmployeeId(null)
                  setSelectedEmployeeId(null)
                  setPendingWarnings([])
                  setPendingEmployeeId(null)
                }}
              >
                Cancel change
              </Button>
            </div>
          ) : null}

          <section ref={assignedPanelRef} className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Assigned carers</h4>
            {(job.allocations ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No carers on this job yet.</p>
            ) : (
              <ul className="space-y-2">
                {(job.allocations ?? []).map((allocation) => (
                  <li
                    key={allocation.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-medium truncate">
                        {employeeNameFromAllocation(allocation)}
                        {multiCarerJob && allocation.isLeadCarer ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                            <Crown className="h-3 w-3" aria-hidden />
                            Lead
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{allocation.status}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      {!readOnly && multiCarerJob && !allocation.isLeadCarer ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={setLeadCarer.isPending || !!allocatingEmployeeId}
                          onClick={() => handleSetLeadCarer(allocation.employeeId)}
                        >
                          <Crown className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                          Set lead
                        </Button>
                      ) : null}
                      {!readOnly ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant={replacingEmployeeId === allocation.employeeId ? 'default' : 'outline'}
                            disabled={!!allocatingEmployeeId || unallocate.isPending}
                            onClick={() => {
                              setReplacingEmployeeId(allocation.employeeId)
                              setSelectedEmployeeId(null)
                              setPendingWarnings([])
                              setPendingEmployeeId(null)
                            }}
                          >
                            <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                            Change
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={unallocate.isPending || !!allocatingEmployeeId}
                            onClick={() => handleUnallocate(allocation.employeeId)}
                          >
                            <UserMinus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                            Remove
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">On rota: {employeesLabel(job)}</p>
          </section>

          {!readOnly ? (
            <ScheduleJobRecommendedCarers
              job={job}
              allocatedEmployeeIds={allocatedEmployeeIds}
              allocatingEmployeeId={allocatingEmployeeId}
              replacingEmployeeId={replacingEmployeeId}
              onAssign={(employeeId) => handlePickEmployee(employeeId)}
              onCandidatesChange={setSuggestCandidates}
            />
          ) : null}

          {!readOnly ? (
          <section className="space-y-3 border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-foreground">{manualSectionTitle}</h4>
            {rotaBookedEmployeeIds.size > 0 ? (
              <p className="text-xs text-muted-foreground">
                Carers already booked at this time are hidden from search.
              </p>
            ) : null}
            {multiCarerJob && (needsMoreCarers || replacingEmployeeId) ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={assignAsLead}
                  onChange={(e) => setAssignAsLead(e.target.checked)}
                />
                Assign as lead carer
              </label>
            ) : null}
            <div>
              <Label htmlFor="allocate-employee-search" className="text-xs text-muted-foreground">
                Search employees
              </Label>
              <Input
                id="allocate-employee-search"
                className="mt-1"
                placeholder="Search by name…"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />
            </div>

            {employeesQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading employees…
              </div>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-1">
                {filteredEmployees.length === 0 ? (
                  <li className="px-2 py-3 text-center text-sm text-muted-foreground">
                    No employees match your search.
                  </li>
                ) : (
                  filteredEmployees.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted/60',
                          selectedEmployeeId === row.id && 'bg-sky-50 ring-1 ring-sky-300 dark:bg-sky-950/40',
                        )}
                        onClick={() => setSelectedEmployeeId(row.id)}
                      >
                        <span className="font-medium">{employeeListRowDisplayName(row)}</span>
                        {selectedEmployeeId === row.id ? (
                          <span className="text-xs text-sky-700 dark:text-sky-300">Selected</span>
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}

            {pendingWarnings.length > 0 ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                <p className="font-semibold text-amber-950 dark:text-amber-100">
                  Allocation warnings
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-900 dark:text-amber-200">
                  {pendingWarnings.map((w) => (
                    <li key={`${w.type}-${w.message}`}>{w.message}</li>
                  ))}
                </ul>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  variant="secondary"
                  disabled={allocate.isPending || unallocate.isPending}
                  onClick={handleForceAllocate}
                >
                  {replacingEmployeeId ? 'Change anyway' : 'Allocate anyway'}
                </Button>
              </div>
            ) : null}
          </section>
          ) : null}

          {job.visitPlan && !readOnly ? (
            <p className="text-xs text-muted-foreground border-t border-border pt-3">
              To change default carers for future visits, update the{' '}
              <Link
                to="/service-users/$serviceUserId/visit-plan"
                params={{ serviceUserId: job.serviceUserId }}
                className="text-sky-600 underline"
                onClick={() => onOpenChange(false)}
              >
                visit plan
              </Link>
              .
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter className="border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!readOnly ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={!timesChanged || !nextScheduleTimes || savingTimes || updateJob.isPending}
                onClick={() => void handleSaveTimes()}
              >
                {savingTimes || updateJob.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Clock className="mr-2 h-4 w-4" aria-hidden />
                )}
                Save times
              </Button>
              <Button
                type="button"
                disabled={!selectedEmployeeId || allocate.isPending || unallocate.isPending}
                onClick={handleAllocate}
              >
                {allocate.isPending || unallocate.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                )}
                {replacingEmployeeId ? 'Change carer' : needsMoreCarers ? 'Allocate carer' : 'Assign carer'}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
