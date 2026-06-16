import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
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
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { ScheduleJobDeliveredCarePlans } from '@/features/scheduling/components/ScheduleJobDeliveredCarePlans'
import {
  carePlanOptionsForScheduleJob,
  defaultDeliveredCarePlanIds,
} from '@/features/scheduling/utils/schedule-job-complete-care-plans.util'
import { formatJobTimeRange, serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import { timelineJobLinkedCarePlanIds } from '@/features/scheduling/utils/scheduling-visit-plan.util'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: TimelineJob | null
  onCompleted?: () => void
}

export function ScheduleJobCompleteDialog({ open, onOpenChange, job, onCompleted }: Props) {
  const completeJob = useCompleteHousekeepingJob()
  const [notes, setNotes] = React.useState('')
  const [deliveredIds, setDeliveredIds] = React.useState<string[]>([])

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

  React.useEffect(() => {
    if (!open || !job) return
    setNotes(job.notes?.trim() ?? '')
    setDeliveredIds([])
  }, [open, job?.id])

  React.useEffect(() => {
    if (!open || !job || acceptedQuery.isLoading) return
    setDeliveredIds(defaultDeliveredCarePlanIds(job, carePlanOptions))
  }, [open, job, acceptedQuery.isLoading, carePlanOptions])

  const handleComplete = async () => {
    if (!job) return
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
      })
      toastSuccess('Job completed')
      onCompleted?.()
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not complete job')
    }
  }

  const visitLabel = job?.visitPlan?.label?.trim()

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
                disabled={completeJob.isPending}
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
              onChange={(e) => setNotes(e.target.value)}
              disabled={completeJob.isPending}
              placeholder="Tasks completed, concerns, handover notes…"
            />
          </section>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={completeJob.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleComplete()} disabled={!job || completeJob.isPending}>
            {completeJob.isPending ? (
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
