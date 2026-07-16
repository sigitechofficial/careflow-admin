import * as React from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Play, Smartphone } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { getScheduledJob } from '@/features/scheduling/api/scheduling.api'
import { schedulingKeys } from '@/features/scheduling/keys'
import {
  ScheduleVisitWorkspaceContent,
  type ScheduleVisitWorkspaceTab,
} from '@/features/scheduling/components/ScheduleVisitWorkspaceContent'
import { VisitDeliveryStatusPanel } from '@/features/scheduling/components/VisitDeliveryStatusPanel'
import { assessVisitDeliveryFromJobLike } from '@/features/scheduling/utils/visit-delivery-assessment.util'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { jobScheduleDateIso } from '@/features/scheduling/utils/schedule-jobs-drag.util'

type HubSearch = {
  date?: string
  tab?: ScheduleVisitWorkspaceTab
  returnTo?: string
}

export default function CarerVisitHubPage() {
  const { jobId = '' } = useParams({ strict: false }) as { jobId?: string }
  const search = useSearch({ strict: false }) as HubSearch
  const navigate = useNavigate()

  const jobQuery = useQuery({
    queryKey: schedulingKeys.job(jobId),
    queryFn: () => getScheduledJob(jobId),
    enabled: Boolean(jobId),
  })

  const job = jobQuery.data as TimelineJob | undefined
  const date = search.date ?? (job ? jobScheduleDateIso(job) : '')
  const returnTo = search.returnTo ?? `/scheduling/schedule-jobs${date ? `?date=${encodeURIComponent(date)}` : ''}`
  const defaultTab = search.tab ?? 'overview'

  const [checkedIn, setCheckedIn] = React.useState(false)

  React.useEffect(() => {
    setCheckedIn(false)
  }, [jobId])

  if (jobQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading visit…
      </div>
    )
  }

  if (jobQuery.isError || !job) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">Visit not found or you do not have access.</p>
        <Button type="button" variant="outline" asChild>
          <Link to="/scheduling/schedule-jobs" search={date ? { date } : {}}>
            Back to schedule
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" className="shrink-0" asChild>
            <Link to={returnTo}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{serviceUserLabel(job.serviceUser)}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" aria-hidden />
              Carer visit hub
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {!checkedIn && (job.deliveryAssessment || job.actualStartDateTime || job.visits?.length) ? (
          <div className="mb-4">
            <VisitDeliveryStatusPanel
              assessment={
                job.deliveryAssessment ??
                assessVisitDeliveryFromJobLike({
                  status: job.status,
                  requiredCarers: job.requiredCarers,
                  allocatedCarers: job.allocatedCarers,
                  allocations: job.allocations,
                  scheduledStartDateTime: job.scheduledStartDateTime,
                  scheduledEndDateTime: job.scheduledEndDateTime,
                  actualStartDateTime: job.actualStartDateTime,
                  actualEndDateTime: job.actualEndDateTime,
                  visitPlan: job.visitPlan,
                  visits: job.visits,
                  latestAttendanceEventType: job.attendanceEvents?.[0]?.eventType,
                })
              }
              timingException={job.timingException}
              cancellation={job.cancellation}
            />
          </div>
        ) : null}

        {!checkedIn ? (
          <section className="mb-4 rounded-xl border border-border bg-muted/40 px-4 py-4">
            <h2 className="text-sm font-semibold text-foreground">Office visit workspace</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              This admin hub does <span className="font-medium text-foreground">not</span> record
              Electronic Call Monitoring (GPS check-in). Field ECM comes from the carer mobile app.
              Use office complete/allocate actions below for manual outcomes and times.
            </p>
            <Button type="button" className="mt-3 w-full" variant="outline" onClick={() => setCheckedIn(true)}>
              <Play className="mr-2 h-4 w-4" aria-hidden />
              Open visit workspace
            </Button>
          </section>
        ) : null}

        {checkedIn ? (
          <ScheduleVisitWorkspaceContent
            job={job}
            date={date}
            returnTo={returnTo}
            defaultTab={defaultTab}
            layout="hub"
            onCompleteVisit={() => {
              void navigate({
                to: '/scheduling/schedule-jobs',
                search: { date, visitAction: 'complete', actionJobId: job.id },
              })
            }}
            onAddNotes={() => {
              void navigate({
                to: '/scheduling/schedule-jobs',
                search: { date, visitAction: 'notes', actionJobId: job.id },
              })
            }}
            onAllocate={() => {
              void navigate({
                to: '/scheduling/schedule-jobs',
                search: { date, visitAction: 'allocate', actionJobId: job.id },
              })
            }}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Open the workspace to access handover, body map, and office visit actions.
          </p>
        )}
      </main>
    </div>
  )
}
