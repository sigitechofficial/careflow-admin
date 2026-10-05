import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Phone,
  Pill,
  UserCircle,
  Users,
} from 'lucide-react'
import { usePortalDashboard } from '@/features/service-user-portal/hooks/usePortalAboutMe'
import type { PortalDashboardUpcomingVisit, PortalDashboardVisitTask } from '@/features/service-user-portal/api/portal.api'
import { formatPortalDateTime } from '@/features/service-user-portal/components/portal-display.util'
import {
  normalizeVisitTaskPriority,
  visitTaskPriorityBadgeClass,
  visitTaskPriorityLabel,
} from '@/features/service-users/visit-tasks/visit-task-priority.util'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { cn, formatTime } from '@/shared/lib/utils'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import {
  formatOrganisationIsoDate,
  formatOrganisationWeekdayShort,
} from '@/shared/lib/organisation-display-format.store'

const VISIT_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Scheduled',
  STARTED: 'In progress',
  NEEDS_ATTENTION: 'Needs attention',
}

function visitStatusClass(status: string): string {
  switch (status) {
    case 'STARTED':
      return 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
    case 'NEEDS_ATTENTION':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
    default:
      return 'bg-primary/10 text-primary'
  }
}

function formatVisitWhen(iso: string): { date: string; time: string } {
  const day = dayKeyFromInstant(iso)
  if (!day) return { date: '—', time: '' }
  return {
    date: `${formatOrganisationWeekdayShort(day)} ${formatOrganisationIsoDate(day)}`,
    time: formatTime(iso),
  }
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  to,
}: {
  label: string
  value: string | number
  hint: string
  icon: React.ComponentType<{ className?: string }>
  to?: string
}) {
  const inner = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        {to ? <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
      </CardContent>
    </Card>
  )

  if (to) {
    return (
      <Link to={to} className="block h-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {inner}
      </Link>
    )
  }
  return inner
}

function VisitTaskRow({ task }: { task: PortalDashboardVisitTask }) {
  const priority = normalizeVisitTaskPriority(task.priority)

  return (
    <li className="flex items-start justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-sm">
      <span className="min-w-0 flex-1">
        <span className="text-foreground">{task.name}</span>
        <span className="text-muted-foreground"> · {task.categoryName}</span>
      </span>
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
          visitTaskPriorityBadgeClass(priority),
        )}
      >
        {visitTaskPriorityLabel(priority)}
      </span>
    </li>
  )
}

function UpcomingVisitCard({ visit }: { visit: PortalDashboardUpcomingVisit }) {
  const when = formatVisitWhen(visit.scheduledStartAt)
  const carers = visit.carers.length ? visit.carers.join(', ') : 'Carer to be assigned'

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{visit.visitName}</h3>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                visitStatusClass(visit.status),
              )}
            >
              {VISIT_STATUS_LABELS[visit.status] ?? visit.status}
            </span>
          </div>
          {visit.roundLabel ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{visit.roundLabel}</p>
          ) : null}
        </div>
        <div className="text-right text-sm">
          <p className="font-medium text-foreground">{when.date}</p>
          <p className="text-muted-foreground">{when.time}</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Carer:</span> {carers}
      </p>

      {visit.tasks.length > 0 ? (
        <details className="group mt-4 border-t border-border pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90"
              aria-hidden
            />
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            Planned tasks ({visit.tasks.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {visit.tasks.map(task => (
              <VisitTaskRow key={task.id} task={task} />
            ))}
          </ul>
        </details>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">No tasks assigned for this visit yet.</p>
      )}
    </div>
  )
}

const QUICK_LINKS = [
  { label: 'Personal details', to: '/portal/profile', icon: UserCircle },
  { label: 'Visit plan', to: '/portal/visit-plans', icon: CalendarClock },
  { label: 'Completed visits', to: '/portal/completed-visits', icon: CheckCircle2 },
  { label: 'Contacts', to: '/portal/contacts', icon: Users },
  { label: 'About Me', to: '/portal/about-me', icon: BookOpen },
  { label: 'Allergies', to: '/portal/allergies', icon: AlertTriangle },
] as const

export default function PortalDashboardPage() {
  const { data, isLoading, error } = usePortalDashboard()

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Could not load dashboard. Please try again later.
      </div>
    )
  }

  const displayName =
    data.profile.preferredName?.trim() ||
    `${data.profile.firstName} ${data.profile.lastName}`.trim()
  const profilePhotoSrc = resolveMediaUrl(data.profile.profilePhotoUrl)
  const nextVisit = data.upcomingVisits[0] ?? null

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-sky-500/10 via-card to-card p-6 shadow-sm sm:p-8">
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {profilePhotoSrc ? (
              <img
                src={profilePhotoSrc}
                alt=""
                className="h-20 w-20 rounded-full border-2 border-background object-cover shadow-md"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-background bg-muted shadow-md">
                <UserCircle className="h-10 w-10 text-muted-foreground" aria-hidden />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">My care portal</p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Welcome back, {displayName}
              </h1>
              {data.profile.careType?.name ? (
                <p className="mt-1 text-sm text-muted-foreground">{data.profile.careType.name}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/portal/profile">Edit profile</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/portal/about-me">About Me</Link>
            </Button>
          </div>
        </div>

        {nextVisit ? (
          <div className="relative mt-6 rounded-xl border border-sky-500/20 bg-background/80 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
              Next visit
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-foreground">{nextVisit.visitName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPortalDateTime(nextVisit.scheduledStartAt)}
                  {nextVisit.carers.length ? ` · ${nextVisit.carers.join(', ')}` : ''}
                </p>
              </div>
              {nextVisit.tasks.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {nextVisit.tasks.length} task{nextVisit.tasks.length === 1 ? '' : 's'} planned
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Upcoming visits"
          value={data.upcomingVisits.length}
          hint="In the next 30 days"
          icon={CalendarClock}
          to="/portal/visit-plans"
        />
        <StatCard
          label="Allergies"
          value={data.allergiesCount}
          hint="On your care record"
          icon={HeartPulse}
          to="/portal/allergies"
        />
        <StatCard
          label="Contacts"
          value={data.contacts.length}
          hint="People on your file"
          icon={Phone}
          to="/portal/contacts"
        />
        <StatCard
          label="Medications"
          value={data.activeMedicationsCount ?? 0}
          hint="Active on your care record"
          icon={Pill}
          to="/portal/medications"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming visits — main column */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Upcoming visits</h2>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              <Link to="/portal/visit-plans">
                Visit plan
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>

          {data.upcomingVisits.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No upcoming care visits in the next 30 days.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {data.upcomingVisits.map(visit => (
                <UpcomingVisitCard key={visit.id} visit={visit} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Calendar events</CardTitle>
              <CardDescription>Appointments and events in the next 30 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming events.</p>
              ) : (
                data.upcomingEvents.map(e => (
                  <div key={e.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPortalDateTime(e.startAt)}
                      {e.eventType?.name ? ` · ${e.eventType.name}` : ''}
                    </p>
                  </div>
                ))
              )}
              <Button asChild variant="link" className="h-auto p-0 text-sky-600">
                <Link to="/portal/calendar">View calendar</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Key contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts yet.</p>
              ) : (
                data.contacts.slice(0, 4).map(c => (
                  <div key={c.id} className="text-sm">
                    <span className="font-medium text-foreground">{c.name}</span>
                    {c.relationship ? (
                      <span className="text-muted-foreground"> · {c.relationship}</span>
                    ) : null}
                  </div>
                ))
              )}
              <Button asChild variant="link" className="h-auto p-0 text-sky-600">
                <Link to="/portal/contacts">Manage contacts</Link>
              </Button>
            </CardContent>
          </Card>

          {data.carePlans.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Care plans</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.carePlans.map(cp => (
                  <div key={cp.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-foreground">{cp.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {cp.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Quick links */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Quick links</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
              {label}
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
