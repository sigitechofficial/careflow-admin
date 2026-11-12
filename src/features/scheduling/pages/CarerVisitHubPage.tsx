import * as React from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Hash,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  StickyNote,
  Timer,
  User,
  Users,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { getScheduledJob } from '@/features/scheduling/api/scheduling.api'
import { schedulingKeys } from '@/features/scheduling/keys'
import {
  ScheduleVisitWorkspaceContent,
  type ScheduleVisitWorkspaceTab,
} from '@/features/scheduling/components/ScheduleVisitWorkspaceContent'
import {
  allocationStatusLabel,
  formatJobTimeRange,
  jobStatusLabel,
  serviceUserFullLabel,
} from '@/features/scheduling/utils/scheduling-format'
import { ScheduleVisitRefResetRow } from '@/features/scheduling/components/ScheduleVisitResetDeliveryButton'
import {
  formatOrganisationIsoDate,
  formatOrganisationIsoTime,
} from '@/shared/lib/organisation-display-format.store'
import { SERVICE_USER_PROFILE_ROUTE } from '@/features/service-users/service-user-profile-tabs'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { jobScheduleDateIso } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import { JobTimebankNote } from '@/features/timebank/components/TimebankNotes'

type HubSearch = {
  date?: string
  tab?: ScheduleVisitWorkspaceTab
  returnTo?: string
}

function formatDurationMinutes(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

/** One label/value line in the details sidebar. */
function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm text-foreground">{children}</div>
      </div>
    </div>
  )
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
  const returnTo =
    search.returnTo ??
    `/scheduling/schedule-jobs${date ? `?date=${encodeURIComponent(date)}` : ''}`
  const defaultTab = search.tab ?? 'overview'

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

  const su = job.serviceUser
  const suAddress = su.address
  const addressLine =
    job.address ||
    [suAddress?.addressLine1, suAddress?.addressLine2, suAddress?.town, suAddress?.county]
      .filter(Boolean)
      .join(', ')
  const postcode = job.postcode || suAddress?.postcode || ''
  const latitude = job.latitude ?? su.latitude ?? null
  const longitude = job.longitude ?? su.longitude ?? null
  const mapsHref =
    latitude != null && longitude != null
      ? `https://maps.google.com/?q=${latitude},${longitude}`
      : null

  const clockIn = job.actualStartDateTime ? formatOrganisationIsoTime(job.actualStartDateTime) : null
  const clockOut = job.actualEndDateTime ? formatOrganisationIsoTime(job.actualEndDateTime) : null
  // Flag a stuck visit: clocked in, never clocked out, and the planned end has passed.
  const plannedEnd = job.scheduledEndDateTime ? new Date(job.scheduledEndDateTime) : null
  const missingCheckout =
    Boolean(job.actualStartDateTime) &&
    !job.actualEndDateTime &&
    plannedEnd != null &&
    plannedEnd.getTime() < Date.now()
  const allocations = job.allocations ?? []

  return (
    <div className="w-full px-4 py-4 md:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-5 flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to={returnTo}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-foreground">
                {serviceUserFullLabel(su)}
              </h1>
              <Badge variant="secondary" className="shrink-0">
                {jobStatusLabel(job.status)}
              </Badge>
            </div>
            <ScheduleVisitRefResetRow
              job={job}
              visitRef={job.visitRef}
              visitId={job.visits?.[0]?.id}
              size="sm"
              className="mt-1"
            />
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                {date ? formatOrganisationIsoDate(date) : '—'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {formatJobTimeRange(job)}
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* Main + details sidebar */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <JobTimebankNote scheduledJobId={job.id} />
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
        </div>

        {/* Details sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <section className="rounded-xl border border-border bg-card">
            <h2 className="border-b border-border px-4 py-2.5 text-sm font-semibold text-foreground">
              Visit details
            </h2>
            <div className="divide-y divide-border/60 px-4">
              <DetailRow icon={<User className="h-4 w-4" />} label="Service user">
                <Link
                  to={SERVICE_USER_PROFILE_ROUTE}
                  params={{ serviceUserId: job.serviceUserId }}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {serviceUserFullLabel(su)}
                </Link>
              </DetailRow>

              {job.visitRef ? (
                <DetailRow icon={<Hash className="h-4 w-4" />} label="EMONITORED visit ref">
                  <span className="font-mono text-xs">{job.visitRef}</span>
                </DetailRow>
              ) : null}

              <DetailRow icon={<Calendar className="h-4 w-4" />} label="Scheduled">
                {date ? formatOrganisationIsoDate(date) : '—'} · {formatJobTimeRange(job)}
              </DetailRow>

              <DetailRow icon={<Timer className="h-4 w-4" />} label="Duration">
                {formatDurationMinutes(job.durationMinutes)}
              </DetailRow>

              <DetailRow icon={<LogIn className="h-4 w-4" />} label="Clocked in">
                {clockIn ? (
                  <span className="tabular-nums">{clockIn}</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-500">Not clocked in yet</span>
                )}
              </DetailRow>

              <DetailRow icon={<LogOut className="h-4 w-4" />} label="Clocked out">
                {clockOut ? (
                  <span className="tabular-nums">{clockOut}</span>
                ) : missingCheckout ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400"
                  >
                    <AlertTriangle className="h-3 w-3" aria-hidden />
                    Missing check-out — still clocked in
                  </Badge>
                ) : (
                  '—'
                )}
              </DetailRow>

              <DetailRow icon={<Users className="h-4 w-4" />} label={`Carers (${allocations.length}/${job.requiredCarers})`}>
                {allocations.length ? (
                  <ul className="space-y-1">
                    {allocations.map((a) => {
                      const name =
                        [a.employee?.firstName, a.employee?.lastName].filter(Boolean).join(' ') ||
                        'Unnamed carer'
                      return (
                        <li key={a.id} className="flex flex-wrap items-center gap-1.5">
                          {a.employeeId ? (
                            <Link
                              to="/employee/$employeeId/edit"
                              params={{ employeeId: a.employeeId }}
                              search={{ tab: 'personal' }}
                              className="text-primary underline-offset-2 hover:underline"
                              title="Open carer profile"
                            >
                              {name}
                            </Link>
                          ) : (
                            <span>{name}</span>
                          )}
                          {a.isLeadCarer && job.requiredCarers > 1 ? (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                              Lead
                            </Badge>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            · {allocationStatusLabel(a.status)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <span className="text-amber-600 dark:text-amber-500">Unassigned</span>
                )}
              </DetailRow>

              {addressLine || postcode ? (
                <DetailRow icon={<MapPin className="h-4 w-4" />} label="Address">
                  <span className="whitespace-pre-wrap">
                    {[addressLine, postcode].filter(Boolean).join(', ') || '—'}
                  </span>
                  {mapsHref ? (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block text-xs font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Open in Maps
                    </a>
                  ) : null}
                </DetailRow>
              ) : null}

              {job.scheduleArea?.name ? (
                <DetailRow icon={<Building2 className="h-4 w-4" />} label="Branch / area">
                  {job.scheduleArea.name}
                  {job.scheduleArea.code ? (
                    <span className="text-xs text-muted-foreground"> ({job.scheduleArea.code})</span>
                  ) : null}
                </DetailRow>
              ) : null}

              {job.scheduleRun?.name ? (
                <DetailRow icon={<Users className="h-4 w-4" />} label="Schedule run">
                  {job.scheduleRun.name}
                  {job.runSequence != null ? (
                    <span className="text-xs text-muted-foreground"> · #{job.runSequence}</span>
                  ) : null}
                </DetailRow>
              ) : null}

              {job.notes?.trim() ? (
                <DetailRow icon={<StickyNote className="h-4 w-4" />} label="Notes">
                  <span className="whitespace-pre-wrap">{job.notes.trim()}</span>
                </DetailRow>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
