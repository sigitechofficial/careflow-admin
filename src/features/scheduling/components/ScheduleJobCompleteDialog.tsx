import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, Loader2 } from 'lucide-react'
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
import { fetchAcceptedCarePlans } from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import { useCompleteHousekeepingJob } from '@/features/scheduling/hooks/useSchedulingMutations'
import { ScheduleJobCompleteCarerSection } from '@/features/scheduling/components/ScheduleJobCompleteCarerSection'
import { ScheduleJobDeliveredCarePlans } from '@/features/scheduling/components/ScheduleJobDeliveredCarePlans'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
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
  const [actualStartTime, setActualStartTime] = React.useState('')
  const [actualEndTime, setActualEndTime] = React.useState('')

  const acceptedQuery = useQuery({
    queryKey: job
      ? initialAssessmentKeys.acceptedCarePlans(job.serviceUserId)
      : ['schedule-job-complete', 'no-su'],
    queryFn: () => fetchAcceptedCarePlans(job!.serviceUserId),
    enabled: open && Boolean(job?.serviceUserId),
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
  const actualDateTimes = React.useMemo(() => {
    if (!scheduleDateIso) return null
    return buildJobScheduleDateTimes(scheduleDateIso, actualStartTime, actualEndTime)
  }, [actualEndTime, actualStartTime, scheduleDateIso])

  const actualDurationMinutes = React.useMemo(() => {
    if (!actualDateTimes) return null
    const start = new Date(actualDateTimes.scheduledStartDateTime)
    const end = new Date(actualDateTimes.scheduledEndDateTime)
    return Math.round((end.getTime() - start.getTime()) / 60_000)
  }, [actualDateTimes])

  React.useEffect(() => {
    if (!open || !job) return
    setNotes(job.notes?.trim() ?? '')
    setDeliveredIds([])
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
  }, [open, job?.id, job?.actualEndDateTime, job?.actualStartDateTime, job?.scheduledEndDateTime, job?.scheduledStartDateTime])

  React.useEffect(() => {
    if (!open || !job || acceptedQuery.isLoading) return
    setDeliveredIds(defaultDeliveredCarePlanIds(job, carePlanOptions))
  }, [open, job, acceptedQuery.isLoading, carePlanOptions])

  const handleComplete = async () => {
    if (!job) return
    if (jobNeedsCarerAssignment(job)) {
      toastWarning(
        'Assign carers first',
        `Allocate ${job.requiredCarers} carer${job.requiredCarers === 1 ? '' : 's'} before completing this visit.`,
      )
      return
    }
    if (!actualStartTime || !actualEndTime || !actualDateTimes) {
      toastWarning('Enter visit times', 'Actual start and end times are required to complete this job.')
      return
    }
    if (deliveredIds.length === 0) {
      toastWarning(
        'Select care plans',
        'Tick at least one care plan delivered on this visit, or add a note explaining why none apply.',
      )
      return
    }
    try {
      await completeJob.mutateAsync({
        jobId: job.id,
        notes: notes.trim() || undefined,
        deliveredCarePlanFormIds: deliveredIds,
        actualStartDateTime: actualDateTimes.scheduledStartDateTime,
        actualEndDateTime: actualDateTimes.scheduledEndDateTime,
      })
      toastSuccess('Job completed')
      onCompleted?.()
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not complete job')
    }
  }

  const visitLabel = job?.visitPlan?.label?.trim()
  const busy = completeJob.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Complete visit</DialogTitle>
          <DialogDescription>
            {job ? (
              <>
                {serviceUserLabel(job.serviceUser)}
                {visitLabel ? ` · ${visitLabel}` : ''} · {formatJobTimeRange(job)}
              </>
            ) : (
              'Record care delivered and complete this job.'
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] space-y-5 overflow-y-auto pe-1">
          {job ? (
            <ScheduleJobCompleteCarerSection
              job={job}
              disabled={busy}
              onAllocated={onJobUpdated}
            />
          ) : null}

          <section className="space-y-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
              <h4 className="text-sm font-semibold text-foreground">Actual visit times</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Record when the visit started and ended. Defaults to the scheduled rota times.
            </p>
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
            {actualDurationMinutes != null ? (
              <p className="text-xs text-muted-foreground">Duration: {actualDurationMinutes} min</p>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Enter a valid start and end time (minimum 5 minutes).
              </p>
            )}
          </section>

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
                Completing…
              </>
            ) : (
              'Complete job'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
