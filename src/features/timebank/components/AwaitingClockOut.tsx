import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { useAuthStore } from '@/features/auth/store'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { useFetchScheduledJob } from '@/features/scheduling/hooks/useScheduling'
import { schedulingKeys } from '@/features/scheduling/keys'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { ScheduleJobCompleteDialog } from '@/features/scheduling/components/ScheduleJobCompleteDialog'
import { ScheduleVisitWorkspaceSheet } from '@/features/scheduling/components/ScheduleVisitWorkspaceSheet'
import { timebankKeys } from '@/features/timebank/hooks/useTimebank'
import type { TimebankAwaitingVisit } from '@/features/timebank/types'
import { formatMinutes } from '@/features/timebank/timebank-format'

/**
 * "Open visit" and "Close visit" for one visit awaiting clock-out, without leaving the Timebank.
 * Open visit shows the rota board's visit workspace panel; Close visit (and Record visit outcome inside the
 * workspace) opens the board's "Record visit" dialog, so the checks and permission are the board's own.
 * Close visit shows only to users who may complete visits.
 */
export function AwaitingVisitActions({ jobId, day }: { jobId: string; day: string }) {
  const canComplete = useAuthStore(s => s.can('scheduled_jobs_housekeeping.complete'))
  const qc = useQueryClient()
  const fetchJob = useFetchScheduledJob()
  const [workspaceJob, setWorkspaceJob] = React.useState<TimelineJob | null>(null)
  const [completeJob, setCompleteJob] = React.useState<TimelineJob | null>(null)
  const [loading, setLoading] = React.useState<'open' | 'close' | null>(null)
  const [failed, setFailed] = React.useState(false)

  const load = async (target: 'open' | 'close') => {
    setLoading(target)
    setFailed(false)
    try {
      const job = await fetchJob(jobId)
      if (target === 'open') setWorkspaceJob(job)
      else setCompleteJob(job)
    } catch {
      setFailed(true)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs text-primary"
        disabled={loading != null}
        onClick={() => void load('open')}
        data-testid="timebank-open-visit"
      >
        {loading === 'open' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
        Open visit
      </Button>
      {canComplete ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          disabled={loading != null}
          onClick={() => void load('close')}
          data-testid="timebank-close-visit"
        >
          {loading === 'close' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
          Close visit
        </Button>
      ) : null}
      {failed ? <span className="text-xs text-destructive">Couldn't load the visit.</span> : null}
      <ScheduleVisitWorkspaceSheet
        open={workspaceJob != null}
        onOpenChange={open => {
          if (!open) setWorkspaceJob(null)
        }}
        job={workspaceJob}
        date={day}
        onCompleteVisit={
          canComplete
            ? job => {
                setWorkspaceJob(null)
                setCompleteJob(job)
              }
            : undefined
        }
      />
      <ScheduleJobCompleteDialog
        open={completeJob != null}
        onOpenChange={open => {
          if (!open) setCompleteJob(null)
        }}
        job={completeJob}
        onCompleted={() => {
          void qc.invalidateQueries({ queryKey: timebankKeys.all })
          void qc.invalidateQueries({ queryKey: schedulingKeys.job(jobId) })
        }}
      />
    </>
  )
}

/** Side panel listing a service user's visits awaiting clock-out for the week, each with Open visit and Close visit. */
export function AwaitingVisitsSheet({
  open,
  onOpenChange,
  serviceUserName,
  visits,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserName: string
  visits: TimebankAwaitingVisit[]
}) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle>Awaiting clock-out — {serviceUserName}</SheetTitle>
          <SheetDescription>
            The carer clocked in but never clocked out. Close the visit to count its hours; until then they are not
            delivered and not short.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No visits are awaiting clock-out.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border" data-testid="timebank-awaiting-list">
              {visits.map(v => (
                <li key={v.jobId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{v.jobName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(v.day)} · {formatTime(v.start)}
                      {v.end ? `–${formatTime(v.end)}` : ''} · {formatMinutes(v.plannedMinutes)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <AwaitingVisitActions jobId={v.jobId} day={v.day} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
