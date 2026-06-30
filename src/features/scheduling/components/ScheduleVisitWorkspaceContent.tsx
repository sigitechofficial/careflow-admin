import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  CheckSquare,
  Clock,
  ExternalLink,
  MapPin,
  Pill,
  Smartphone,
  StickyNote,
  Users,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { BodyMapHandoverPreview } from '@/features/service-users/body-map/components/BodyMapHandoverPreview'
import { scheduleVisitBodyMapSearch } from '@/features/service-users/body-map/utils/body-map-visit-navigation'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { VisitBodyMapCapture } from '@/features/scheduling/components/VisitBodyMapCapture'
import { VisitJobTasksPanel } from '@/features/scheduling/components/VisitJobTasksPanel'
import { VisitMedicationPanel } from '@/features/scheduling/components/VisitMedicationPanel'
import {
  buildScheduleVisitContext,
  type ScheduleVisitContext,
} from '@/features/scheduling/utils/schedule-visit-context.util'
import {
  employeesLabel,
  formatJobTimeRange,
  jobStatusLabel,
  serviceUserLabel,
} from '@/features/scheduling/utils/scheduling-format'
import { timelineJobVisitPlanSlot } from '@/features/scheduling/utils/scheduling-visit-plan.util'

export type ScheduleVisitWorkspaceTab = 'overview' | 'tasks' | 'body-map' | 'medication'

type Props = {
  job: TimelineJob
  date: string
  returnTo?: string
  defaultTab?: ScheduleVisitWorkspaceTab
  layout?: 'sheet' | 'hub'
  onCompleteVisit?: () => void
  onAddNotes?: () => void
  onAllocate?: () => void
}

export function ScheduleVisitWorkspaceContent({
  job,
  date,
  returnTo,
  defaultTab = 'overview',
  layout = 'sheet',
  onCompleteVisit,
  onAddNotes,
  onAllocate,
}: Props) {
  const [tab, setTab] = React.useState<ScheduleVisitWorkspaceTab>(defaultTab)
  const visitContext = React.useMemo(
    () => buildScheduleVisitContext(job, date),
    [job, date],
  )

  React.useEffect(() => {
    setTab(defaultTab)
  }, [defaultTab, job.id])

  const bodyMapSearch = scheduleVisitBodyMapSearch({
    scheduledJobId: visitContext.scheduledJobId,
    scheduledVisitId: visitContext.scheduledVisitId,
    returnTo,
  })

  const visitSlot = timelineJobVisitPlanSlot(job)

  return (
    <div className={cn('flex min-h-0 flex-col', layout === 'hub' && 'gap-4')}>
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {(
          [
            ['overview', 'Overview'],
            ['tasks', 'Tasks'],
            ['medication', 'Medication'],
            ['body-map', 'Body map'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={tab === id ? 'default' : 'outline'}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="space-y-4 overflow-y-auto">
          <section className="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <p className="text-base font-semibold text-foreground">{serviceUserLabel(job.serviceUser)}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {visitSlot ? `${visitSlot} · ` : ''}
              {formatJobTimeRange(job)} · {jobStatusLabel(job.status)}
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Carers: {employeesLabel(job)} ({job.allocations?.length ?? 0}/{job.requiredCarers})
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" aria-hidden />
                <span>Date: {date}</span>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Handover — body map</h3>
            <BodyMapHandoverPreview serviceUserId={job.serviceUserId} />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Visit actions</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" className="justify-start" onClick={() => setTab('body-map')}>
                <MapPin className="mr-2 h-4 w-4" aria-hidden />
                Record body map
              </Button>
              <Button type="button" variant="outline" className="justify-start" asChild>
                <Link
                  to="/service-users/$serviceUserId/body-map"
                  params={{ serviceUserId: job.serviceUserId }}
                  search={bodyMapSearch}
                >
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                  Open full body map
                </Link>
              </Button>
              <Button type="button" variant="outline" className="justify-start" onClick={() => setTab('tasks')}>
                <CheckSquare className="mr-2 h-4 w-4" aria-hidden />
                Visit tasks checklist
              </Button>
              <Button type="button" variant="outline" className="justify-start" onClick={() => setTab('medication')}>
                <Pill className="mr-2 h-4 w-4" aria-hidden />
                Medication &amp; blister pack
              </Button>
              {visitContext.medicationRequired ? (
                <Button type="button" variant="outline" className="justify-start" asChild>
                  <Link
                    to="/service-users/$serviceUserId/medication"
                    params={{ serviceUserId: job.serviceUserId }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                    Open full MAR
                  </Link>
                </Button>
              ) : null}
              {onAddNotes ? (
                <Button type="button" variant="outline" className="justify-start" onClick={onAddNotes}>
                  <StickyNote className="mr-2 h-4 w-4" aria-hidden />
                  Visit notes
                </Button>
              ) : null}
              {onAllocate ? (
                <Button type="button" variant="outline" className="justify-start" onClick={onAllocate}>
                  <Users className="mr-2 h-4 w-4" aria-hidden />
                  Manage carers
                </Button>
              ) : null}
              {onCompleteVisit ? (
                <Button type="button" className="justify-start sm:col-span-2" onClick={onCompleteVisit}>
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
                  Record visit outcome
                </Button>
              ) : null}
              <Button type="button" variant="outline" className="justify-start sm:col-span-2" asChild>
                <Link
                  to="/scheduling/visits/$jobId"
                  params={{ jobId: job.id }}
                  search={{ date, returnTo }}
                >
                  <Smartphone className="mr-2 h-4 w-4" aria-hidden />
                  Open carer visit hub
                </Link>
              </Button>
            </div>
          </section>
        </div>
      ) : tab === 'tasks' ? (
        <div className="min-h-0 overflow-y-auto">
          <VisitJobTasksPanel jobId={job.id} />
        </div>
      ) : tab === 'medication' ? (
        <div className="min-h-0 overflow-y-auto">
          <VisitMedicationPanel
            serviceUserId={job.serviceUserId}
            visitDate={date}
            medicationRoundCode={job.visitPlan?.medicationRoundCode ?? job.visitPlan?.slotCode}
            medicationRoundLabel={job.visitPlan?.label}
          />
        </div>
      ) : (
        <div className="min-h-0 overflow-y-auto">
          <VisitBodyMapCapture visitContext={visitContext} />
          <div className="mt-3">
            <Button type="button" variant="link" size="sm" className="h-auto px-0" asChild>
              <Link
                to="/service-users/$serviceUserId/body-map"
                params={{ serviceUserId: job.serviceUserId }}
                search={bodyMapSearch}
              >
                Open full body map module
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export type { ScheduleVisitContext }
