import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, CalendarDays, ChevronRight, CircleHelp, UserPlus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { useAuthStore } from '@/features/auth/store'
import { useLearningDashboard } from '@/features/learning/hooks/useLearning'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { LEARNING_PATHS } from '@/features/learning/learning-routes'
import { LearningModuleFlowPanel } from '@/features/learning/components/LearningModuleFlowPanel'
import { AssignmentWizardDialog } from '@/features/learning/components/AssignmentWizardDialog'

/**
 * Learning dashboard (redesigned 17 Nov 2026): who is not up to date, and what needs doing today.
 * Headline numbers, an action list, assignments by status, next sessions, weakest mandatory courses.
 */

type LinkTarget = { to: string; search?: Record<string, string> }

const ASSIGNMENTS = LEARNING_PATHS.assignments

function StatCard({
  label,
  value,
  hint,
  target,
  loading,
  tone,
  children,
}: {
  label: string
  value: React.ReactNode
  hint: string
  target: LinkTarget
  loading: boolean
  tone?: 'danger'
  children?: React.ReactNode
}) {
  return (
    <Link
      to={target.to}
      search={target.search as never}
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/20"
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-display font-bold tabular-nums',
          tone === 'danger' ? 'text-red-700 dark:text-red-300' : 'text-foreground',
        )}
      >
        {loading ? '—' : value}
      </p>
      {children}
      <p className="mt-1 text-xs text-muted-foreground">{loading ? ' ' : hint}</p>
    </Link>
  )
}

function ActionRow({
  label,
  hint,
  count,
  target,
  tone,
  loading,
}: {
  label: string
  hint: string
  count: number
  target: LinkTarget
  tone: 'danger' | 'warning'
  loading: boolean
}) {
  const active = !loading && count > 0
  return (
    <li>
      <Link
        to={target.to}
        search={target.search as never}
        className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/40"
      >
        <span className={cn('min-w-0', !active && 'text-muted-foreground')}>
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">{hint}</span>
        </span>
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums',
            !active && 'text-muted-foreground',
            active && tone === 'danger' && 'text-red-700 dark:text-red-300',
            active && tone === 'warning' && 'text-amber-700 dark:text-amber-300',
          )}
        >
          {loading ? '—' : count}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </Link>
    </li>
  )
}

const STATUS_SEGMENTS = [
  { key: 'done', label: 'Passed', className: 'bg-emerald-600' },
  { key: 'inProgress', label: 'In progress', className: 'bg-sky-600' },
  { key: 'notStarted', label: 'Scheduled', className: 'bg-slate-400' },
  { key: 'overdue', label: 'Overdue', className: 'bg-orange-500' },
  { key: 'notPassed', label: 'Not passed', className: 'bg-red-600' },
  { key: 'incomplete', label: 'Incomplete', className: 'bg-amber-400' },
] as const

export function LearningDashboardPanel() {
  const { locationId } = useGlobalLocationScope()
  const { data, isLoading, isError } = useLearningDashboard(locationId)
  const canAssign = useAuthStore(s => s.can('learning.assignments.manage'))
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [assignOpen, setAssignOpen] = React.useState(false)

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Unable to load learning dashboard summary.
      </div>
    )
  }

  const by = data?.assignmentsByStatus ?? {}
  const n = (...keys: string[]) => keys.reduce((sum, k) => sum + (by[k] ?? 0), 0)
  const segments = {
    done: n('COMPLETED', 'PASSED'),
    inProgress: n('IN_PROGRESS', 'AWAITING_ASSESSMENT', 'AWAITING_APPROVAL'),
    notStarted: n('ASSIGNED', 'NOT_STARTED'),
    overdue: n('OVERDUE'),
    notPassed: n('FAILED'),
    incomplete: n('EXPIRED'),
  }
  const segmentTotal = Object.values(segments).reduce((a, b) => a + b, 0)

  const mandatoryOwed = data?.mandatoryOwed ?? 0
  const mandatoryDone = data?.mandatoryCompleted ?? 0
  const mandatoryPct = mandatoryOwed ? Math.round((mandatoryDone / mandatoryOwed) * 100) : null
  const nextSessions = data?.nextSessions ?? []
  const weakest = data?.mandatoryCoursesLowest ?? []

  return (
    <div className="space-y-6" data-testid="learning-dashboard-panel">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
            <CircleHelp className="mr-1 h-4 w-4" />
            How Learning works
          </Button>
          {canAssign ? (
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <UserPlus className="mr-1 h-4 w-4" />
              Assign training
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Mandatory training done"
          value={mandatoryPct == null ? '—' : `${mandatoryPct}%`}
          hint={mandatoryOwed ? `${mandatoryDone} of ${mandatoryOwed} assignments` : 'No mandatory training assigned'}
          target={{ to: LEARNING_PATHS.compliance }}
          loading={isLoading}
        >
          <div className="mt-2 h-1.5 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-emerald-600"
              style={{ width: `${mandatoryPct ?? 0}%` }}
            />
          </div>
        </StatCard>
        <StatCard
          label="Overdue"
          value={data?.overdueAssignments ?? 0}
          hint="Past due date, not done"
          target={{ to: ASSIGNMENTS, search: { tab: 'OVERDUE' } }}
          loading={isLoading}
          tone={(data?.overdueAssignments ?? 0) > 0 ? 'danger' : undefined}
        />
        <StatCard
          label="Due in next 30 days"
          value={data?.dueNext30 ?? 0}
          hint="Scheduled or in progress"
          target={{ to: ASSIGNMENTS }}
          loading={isLoading}
        />
        <StatCard
          label="Certificates expiring"
          value={data?.certificatesExpiring30 ?? 0}
          hint={`Next 30 days · ${data?.certificatesExpired ?? 0} expired`}
          target={{ to: LEARNING_PATHS.certificates }}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
            Needs your action
          </h3>
          <ul className="divide-y divide-border">
            <ActionRow
              label="Not passed"
              hint="Failed the quiz or the trainer's assessment – give the course again"
              count={data?.failedAssignments ?? 0}
              target={{ to: ASSIGNMENTS, search: { tab: 'NOT_PASSED' } }}
              tone="danger"
              loading={isLoading}
            />
            <ActionRow
              label="Incomplete"
              hint="Closed by the office before it was finished – give it again if still needed"
              count={data?.expiredAssignments ?? 0}
              target={{ to: ASSIGNMENTS, search: { tab: 'INCOMPLETE' } }}
              tone="warning"
              loading={isLoading}
            />
            <ActionRow
              label="Sessions with attendance not recorded"
              hint="The session has ended"
              count={data?.sessionsNeedAttendance ?? 0}
              target={{ to: LEARNING_PATHS.trainingEvents }}
              tone="warning"
              loading={isLoading}
            />
            <ActionRow
              label="Waiting for your sign-off"
              hint="Face to face outcome or manager approval"
              count={data?.awaitingSignOff ?? 0}
              target={{ to: ASSIGNMENTS, search: { tab: 'IN_PROGRESS' } }}
              tone="warning"
              loading={isLoading}
            />
            <ActionRow
              label="External training to verify"
              hint="Training done with another provider, added by the office"
              count={data?.externalTrainingPending ?? 0}
              target={{ to: LEARNING_PATHS.externalTraining }}
              tone="warning"
              loading={isLoading}
            />
          </ul>
        </section>

        <div className="grid gap-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Assignments by status</h3>
            {segmentTotal ? (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                  {STATUS_SEGMENTS.map(s =>
                    segments[s.key] ? (
                      <div
                        key={s.key}
                        className={s.className}
                        style={{ width: `${(segments[s.key] / segmentTotal) * 100}%` }}
                        title={`${s.label}: ${segments[s.key]}`}
                      />
                    ) : null,
                  )}
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {STATUS_SEGMENTS.map(s => (
                    <li key={s.key} className="flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 shrink-0 rounded-sm', s.className)} aria-hidden />
                      {s.label}
                      <span className="ml-auto font-medium tabular-nums text-foreground">{segments[s.key]}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{isLoading ? 'Loading…' : 'No training assigned yet.'}</p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarDays className="h-4 w-4 text-sky-600" aria-hidden />
                Next sessions
              </h3>
              <Link to={LEARNING_PATHS.trainingEvents} className="text-xs font-medium text-primary hover:underline">
                All sessions
              </Link>
            </div>
            {nextSessions.length ? (
              <ul className="divide-y divide-border">
                {nextSessions.map(s => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{s.courseTitle ?? s.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatOrganisationDateTime(s.startAt)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{s.booked} booked</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{isLoading ? 'Loading…' : 'No sessions coming up.'}</p>
            )}
          </section>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Mandatory courses with lowest completion</h3>
        {weakest.length ? (
          <ul className="space-y-2">
            {weakest.map(c => {
              const pct = c.owed ? Math.round((c.completed / c.owed) * 100) : 0
              return (
                <li key={c.courseId} className="grid grid-cols-[minmax(0,1fr)_minmax(80px,160px)_auto] items-center gap-3 text-sm">
                  <Link
                    to="/learning/courses/$courseId"
                    params={{ courseId: c.courseId }}
                    className="truncate font-medium text-foreground hover:underline"
                  >
                    {c.title}
                  </Link>
                  <span className="h-1.5 rounded-full bg-muted">
                    <span
                      className={cn(
                        'block h-1.5 rounded-full',
                        pct < 34 ? 'bg-red-600' : pct < 67 ? 'bg-amber-500' : 'bg-emerald-600',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {c.completed} of {c.owed}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : 'All mandatory training assigned so far is complete.'}
          </p>
        )}
      </section>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>How Learning works</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <LearningModuleFlowPanel />
          </DialogBody>
        </DialogContent>
      </Dialog>
      {canAssign ? <AssignmentWizardDialog open={assignOpen} onOpenChange={setAssignOpen} /> : null}
    </div>
  )
}
