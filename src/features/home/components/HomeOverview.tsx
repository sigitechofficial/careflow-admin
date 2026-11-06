import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import type { Permission } from '@/features/auth/types'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useEcmExceptions, useEcmLiveDashboard } from '@/features/ecm/hooks/useEcm'
import { useScheduleList } from '@/features/scheduling/hooks/useScheduling'
import { useIncidentStats } from '@/features/incidents/hooks/useIncidents'
import { useLearningDashboard } from '@/features/learning/hooks/useLearning'
import { useHoursApprovals } from '@/features/hours-approvals/hooks'
import { useEmployeeChartSummary } from '@/features/employees/hooks/useEmployees'
import { useVisitReconciliationsSummary } from '@/features/billing/hooks/useVisitReconciliations'
import { useInvoiceRunsSummary } from '@/features/billing/hooks/useInvoiceRuns'
import { usePaymentsSummary } from '@/features/billing/hooks/usePayments'
import { useFundingContractsSummary } from '@/features/billing/hooks/useFundingContracts'
import { usePayrollOverview } from '@/features/payroll/hooks/usePayroll'
import { useSetupChecklist } from '@/features/setup-checklist/hooks'
import { useMyRoleTasks } from '@/features/role-tasks/hooks'
import { useUnreadNotificationCount } from '@/features/notifications/hooks/useUnreadNotificationCount'
import {
  useAppointmentsToday,
  useAssessmentReviewQueue,
  useBodyMapGovernanceAlerts,
  useBodyMapReviewQueue,
  useCarePlanReviewQueue,
  useComplianceSummary,
  useFinanceExceptionQueue,
  useInitialAssessmentReviewQueue,
  useLateMedicationToday,
  useMedicationExceptionsToday,
  usePolicyReviews,
  useServiceUserUpcoming,
  useStaffOffToday,
  useSuspensionReviewsOverdue,
  useOperationsOverview,
} from '@/features/home/hooks/useHomeSignals'
import type { UpcomingCategory } from '@/features/home/hooks/useHomeSignals'
import { illustrationSrc } from '@/components/layout/nav-illustrations'
import { adminNavItems, filterNavByPermission } from '@/components/layout/Sidebar'
import { NAV_MODULES, moduleLandingPath } from '@/components/layout/nav-modules'
import { ModuleIllustration } from '@/components/layout/NavIllustration'
import { ModuleSnapshot, hasModuleDashboard } from '@/features/home/module-dashboards'

/*
 * Home overview: everything that needs attention, ordered by urgency rather than by module.
 *   1. Right now          live, refreshed every minute
 *   2. Waiting for you     decisions someone has to make
 *   3. Coming up           expiries and reviews in the next 30 days (overdue first)
 *   4. Capacity            staff and cover
 *   5. Money               billing and payroll blockers
 *   6. Organisation        setup and policies
 * A figure only loads if the user may see it. Within a section, anything non-zero moves to the top;
 * zeros stay visible but fade, so "all clear" is still information.
 */

const UPCOMING_DAYS = 30
type Tone = 'critical' | 'warning' | 'neutral'

const n = (v: number | null | undefined) => v ?? 0
const plural = (count: number, word: string, many = `${word}s`) => `${count} ${count === 1 ? word : many}`

function useCan() {
  const can = useAuthStore((s) => s.can)
  return React.useCallback((...perms: Permission[]) => perms.some((p) => can(p)), [can])
}

const TONE_TEXT: Record<Tone, string> = {
  critical: 'text-rose-600 dark:text-rose-400',
  warning: 'text-amber-600 dark:text-amber-400',
  neutral: 'text-foreground',
}
const TONE_BAR: Record<Tone, string> = {
  critical: 'bg-rose-500',
  warning: 'bg-amber-500',
  neutral: 'bg-primary/60',
}

/* ─── Building blocks ────────────────────────────────────────────────────── */

/** Decorative colourful illustration (same Fluent Emoji set as the navigation). */
function Ill({ name, className, muted }: { name: string; className?: string; muted?: boolean }) {
  return (
    <img
      src={illustrationSrc(name)}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={cn('shrink-0 select-none object-contain transition-[opacity,filter]', muted && 'opacity-45 grayscale', className)}
    />
  )
}

function Section({
  id,
  title,
  description,
  illustration,
  live,
  children,
  className,
}: {
  id: string
  title: string
  description: string
  illustration: string
  live?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <section aria-labelledby={`home-${id}`} data-testid={`home-section-${id}`} className={cn('min-w-0 space-y-3', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={`home-${id}`} className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <Ill name={illustration} className="h-6 w-6" />
          {title}
        </h2>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {live ? <RefreshCw className="h-3 w-3" aria-hidden /> : null}
          {description}
        </p>
      </div>
      {children}
    </section>
  )
}

/** Large live figure for the "Right now" strip. */
function Tile({
  label,
  value,
  detail,
  tone,
  to,
  loading,
  illustration,
}: {
  label: string
  value: number
  detail?: string
  tone: Tone
  to?: string
  loading?: boolean
  illustration: string
}) {
  const active = value > 0
  const body = (
    <>
      <span className={cn('absolute inset-y-0 left-0 w-1 rounded-l-xl', active ? TONE_BAR[tone] : 'bg-transparent')} aria-hidden />
      <Ill name={illustration} muted={!active && tone !== 'neutral'} className="absolute right-3 top-3 h-9 w-9" />
      <span className="pr-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span
        className={cn(
          'mt-1 text-3xl font-bold tabular-nums leading-none',
          active ? TONE_TEXT[tone] : 'text-muted-foreground',
        )}
      >
        {loading ? '…' : value}
      </span>
      {detail ? <span className="mt-1.5 text-xs text-muted-foreground">{detail}</span> : null}
    </>
  )
  const cls = cn(
    'relative flex min-w-0 flex-col rounded-xl border bg-card px-4 py-3.5 shadow-sm',
    active ? 'border-border' : 'border-border/60',
  )
  return to ? (
    <Link to={to} className={cn(cls, 'transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

type RowItem = { id: string; primary: string; secondary?: string; to?: string; params?: Record<string, string>; alert?: boolean }

/** One line in a list section. Non-zero rows sort to the top via flex `order`. */
function Row({
  label,
  value,
  detail,
  tone = 'warning',
  to,
  loading,
  items,
  quiet,
  testId,
  illustration,
}: {
  illustration: string
  label: string
  value: number
  detail?: string
  tone?: Tone
  to?: string
  loading?: boolean
  items?: RowItem[]
  /** Informational figure: never highlighted, never sorted up. */
  quiet?: boolean
  testId?: string
}) {
  const [open, setOpen] = React.useState(false)
  const active = !quiet && value > 0
  const expandable = !!items && items.length > 0
  return (
    <li style={{ order: active ? 0 : 1 }} className="border-b border-border/70 last:border-b-0" data-testid={testId}>
      <div className="flex items-center gap-3 py-2">
        <Ill name={illustration} muted={!active && !quiet} className="h-8 w-8" />
        <span
          className={cn(
            'w-9 shrink-0 text-right text-lg font-bold tabular-nums',
            loading ? 'text-muted-foreground' : active ? TONE_TEXT[tone] : quiet ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {loading ? '…' : value}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm', active || quiet ? 'font-medium text-foreground' : 'text-muted-foreground')}>{label}</p>
          {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
        </div>
        {expandable ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {open ? 'Hide' : 'Who'}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
          </button>
        ) : null}
        {to ? (
          <Link to={to} className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary hover:underline">
            Open <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      {open && items ? (
        <ul className="mb-2 ml-[5.5rem] space-y-1 rounded-lg bg-muted/40 px-3 py-2">
          {items.map((it) => (
            <li key={it.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
              {it.to ? (
                <Link to={it.to} params={it.params as never} className="font-medium text-primary hover:underline">
                  {it.primary}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{it.primary}</span>
              )}
              {it.secondary ? (
                <span className={cn('tabular-nums', it.alert ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
                  {it.secondary}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function RowList({ children }: { children: React.ReactNode }) {
  const kids = React.Children.toArray(children).filter(Boolean)
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-1 shadow-sm">
      {kids.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">Nothing here for your role.</p>
      ) : (
        <ul className="flex flex-col">{kids}</ul>
      )}
    </div>
  )
}

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function upcomingItems(cat: UpcomingCategory | undefined): RowItem[] {
  return (cat?.items ?? []).map((i) => ({
    id: i.id,
    primary: i.serviceUserName,
    secondary: `${i.label} · ${i.overdue ? 'overdue since' : 'due'} ${dateLabel(i.dueDate)}`,
    to: '/service-users/$serviceUserId/profile',
    params: { serviceUserId: i.serviceUserId },
    alert: i.overdue,
  }))
}

function overdueDetail(cat: UpcomingCategory | undefined) {
  const o = n(cat?.overdue)
  return o > 0 ? `${o} already overdue` : 'None overdue'
}

/* ─── You ────────────────────────────────────────────────────────────────── */

function YouStrip() {
  const tasks = useMyRoleTasks('open')
  const unread = useUnreadNotificationCount()
  const open = tasks.data?.tasks ?? []
  const overdue = open.filter((t) => t.dueState === 'overdue').length
  const today = open.filter((t) => t.dueState === 'today').length
  const unreadN = unread.data ?? 0
  const chip = (text: string, active: boolean, tone: Tone) => (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-medium',
        active
          ? tone === 'critical'
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {text}
    </span>
  )
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="home-you">
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Ill name="waving-hand" className="h-5 w-5" />
        You:
      </span>
      <Link to="/my-tasks" className="flex flex-wrap gap-1.5 hover:opacity-80">
        {chip(plural(open.length, 'open task'), open.length > 0, 'warning')}
        {chip(`${overdue} overdue`, overdue > 0, 'critical')}
        {chip(`${today} due today`, today > 0, 'warning')}
      </Link>
      <span title="Open the bell at the top right to read them">
        {chip(plural(unreadN, 'unread notification'), unreadN > 0, 'warning')}
      </span>
    </div>
  )
}

/* ─── 1. Right now ───────────────────────────────────────────────────────── */

const SAFETY_KINDS = ['CARER_SOS', 'LEFT_VISIT_AREA', 'OUTSIDE_GEOFENCE', 'MOCK_LOCATION']
const REQUEST_KINDS = ['UNABLE_TO_START', 'OUTSIDE_AREA_CHECK_IN_REQUEST', 'MANUAL_ATTENDANCE']

function LiveVisitTiles({ locationId }: { locationId: string | null }) {
  const today = operationalTodayIso()
  const live = useEcmLiveDashboard({ dateFrom: today, dateTo: today, locationId: locationId ?? undefined })
  const s = live.data?.summary
  const missed = n(s?.potentialMissed) + n(s?.confirmedMissed)
  const checks = n(s?.missingCheckIn) + n(s?.missingCheckout)
  const pct = s?.completedOnTimePct
  return (
    <>
      <Tile illustration="spiral-calendar"
        label="Visits today"
        value={n(s?.total)}
        detail={`${n(s?.inProgress)} in progress · ${n(s?.completed)} done${pct != null ? ` · ${pct}% on time` : ''}`}
        tone="neutral"
        to="/ecm/live"
        loading={live.isLoading}
      />
      <Tile illustration="cross-mark"
        label="Missed visits"
        value={missed}
        detail={missed ? `${n(s?.confirmedMissed)} confirmed · ${n(s?.potentialMissed)} at risk` : 'None missed'}
        tone="critical"
        to="/ecm/live"
        loading={live.isLoading}
      />
      <Tile illustration="stopwatch"
        label="Check-in problems"
        value={checks}
        detail={checks ? `${n(s?.missingCheckIn)} not checked in · ${n(s?.missingCheckout)} not checked out` : 'All carers checked in and out'}
        tone="warning"
        to="/ecm/live"
        loading={live.isLoading}
      />
    </>
  )
}

function SafetyAlertTiles({ locationId }: { locationId: string | null }) {
  const q = useEcmExceptions({ limit: 200, locationId: locationId ?? undefined })
  const rows = q.data ?? []
  const count = (kinds: string[]) => rows.filter((r) => kinds.includes(String(r.kind))).length
  const sos = count(['CARER_SOS'])
  const safety = count(SAFETY_KINDS)
  const requests = count(REQUEST_KINDS)
  const unable = count(['UNABLE_TO_START'])
  return (
    <>
      <Tile illustration="sos-button"
        label="SOS & safety alerts"
        value={safety}
        detail={safety ? `${sos} SOS · ${safety - sos} location alerts` : 'No open alerts'}
        tone="critical"
        to="/ecm/live"
        loading={q.isLoading}
      />
      <Tile illustration="mobile-phone"
        label="Carer requests"
        value={requests}
        detail={requests ? `${unable} unable to start · ${requests - unable} check-in requests` : 'Nothing waiting'}
        tone="warning"
        to="/ecm/live"
        loading={q.isLoading}
      />
    </>
  )
}

function MedicationTiles({ locationId, canLate }: { locationId: string | null; canLate: boolean }) {
  const meds = useMedicationExceptionsToday(locationId, true)
  const late = useLateMedicationToday(canLate)
  const d = meds.data
  const b = d?.byStatus
  return (
    <>
      <Tile illustration="pill"
        label="Doses not given today"
        value={n(d?.total)}
        detail={
          d?.total
            ? [b?.MISSED && `${b.MISSED} missed`, b?.REFUSED && `${b.REFUSED} refused`, b?.NOT_GIVEN && `${b.NOT_GIVEN} not given`, b?.HELD && `${b.HELD} held`]
                .filter(Boolean)
                .join(' · ')
            : 'Every due dose recorded as given'
        }
        tone="critical"
        loading={meds.isLoading}
      />
      {canLate ? (
        <Tile illustration="alarm-clock"
          label="Doses given late"
          value={n(late.data)}
          detail={late.data ? 'Given after the late threshold' : 'None late'}
          tone="warning"
          loading={late.isLoading}
        />
      ) : null}
    </>
  )
}

function UnallocatedTodayTile() {
  const q = useScheduleList(operationalTodayIso())
  const jobs = q.data?.jobs ?? []
  const need = jobs.filter((j) => j.underAllocated || j.needsCover).length
  return (
    <Tile illustration="woman-health-worker"
      label="Visits needing carers"
      value={need}
      detail={need ? 'Today, under-allocated or needing cover' : 'Every visit today has its carers'}
      tone="critical"
      to="/scheduling/schedule-jobs"
      loading={q.isLoading}
    />
  )
}

/** Dose-by-dose list under the tiles, only when something was not given. */
function MedicationExceptionList({ locationId }: { locationId: string | null }) {
  const meds = useMedicationExceptionsToday(locationId, true)
  const items = meds.data?.items ?? []
  if (!items.length) return null
  const STATUS: Record<string, string> = { MISSED: 'Missed', REFUSED: 'Refused', NOT_GIVEN: 'Not given', HELD: 'Held' }
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 dark:border-rose-900 dark:bg-rose-950/30" data-testid="home-medication-list">
      <p className="mb-2 text-sm font-semibold text-foreground">
        Doses not given today{meds.data?.awaitingReview ? ` · ${meds.data.awaitingReview} not reviewed by a manager` : ''}
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {items.slice(0, 10).map((m) => (
          <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <Link
              to="/service-users/$serviceUserId/medication"
              params={{ serviceUserId: m.serviceUserId }}
              className="font-medium text-primary hover:underline"
            >
              {m.serviceUserName}
            </Link>
            <span className="text-xs text-muted-foreground">
              {m.medicationName} · <span className="font-medium text-rose-700 dark:text-rose-300">{STATUS[m.status] ?? m.status}</span>
              {m.dueAt ? ` · ${new Date(m.dueAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RightNow({ locationId }: { locationId: string | null }) {
  const can = useCan()
  const canEcm = can('ecm.read', 'ecm.monitor')
  const canMeds = can('service_users.read')
  const canSchedule = can('schedule.read', 'schedules.read', 'scheduled_visits.read', 'scheduled_jobs.read')
  if (!canEcm && !canMeds && !canSchedule) return null
  return (
    <Section illustration="alarm-clock" id="right-now" title="Right now" description="Live · refreshes every minute" live>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {canEcm ? <LiveVisitTiles locationId={locationId} /> : null}
        {canSchedule ? <UnallocatedTodayTile /> : null}
        {canEcm ? <SafetyAlertTiles locationId={locationId} /> : null}
        {canMeds ? <MedicationTiles locationId={locationId} canLate={canMeds} /> : null}
      </div>
      {canMeds ? <MedicationExceptionList locationId={locationId} /> : null}
    </Section>
  )
}

/* ─── 2. Waiting for a decision ──────────────────────────────────────────── */

function ReconciliationDecisionRows({ locationId }: { locationId: string | null }) {
  const q = useVisitReconciliationsSummary(locationId)
  return (
    <>
      <Row illustration="check-mark-button" label="Visits needing manager approval" detail="Overruns and changes to approve" value={n(q.data?.requiresManagerApproval)} tone="critical" to="/billing/visit-reconciliation" loading={q.isLoading} />
      <Row illustration="balance-scale" label="Visits waiting for review" detail="Reconciliation not checked yet" value={n(q.data?.pendingReview)} to="/billing/visit-reconciliation" loading={q.isLoading} />
    </>
  )
}

function MedicationReviewRow({ locationId }: { locationId: string | null }) {
  const q = useMedicationExceptionsToday(locationId, true)
  return <Row illustration="pill" label="Doses not given, not yet reviewed" detail="Today, waiting for a manager to review" value={n(q.data?.awaitingReview)} tone="critical" loading={q.isLoading} />
}

function ComplianceReviewRow({ locationId }: { locationId: string | null }) {
  const q = useComplianceSummary(locationId, true)
  return <Row illustration="identification-card" label="Staff documents to check" detail="Uploaded and waiting to be verified" value={n(q.data?.pendingReview)} to="/employee/compliance" loading={q.isLoading} />
}

function BodyMapRows({ locationId }: { locationId: string | null }) {
  const queue = useBodyMapReviewQueue(locationId, true)
  const alerts = useBodyMapGovernanceAlerts(true)
  return (
    <>
      <Row illustration="heart-hands" label="Body map safeguarding alerts" detail="Marks flagged for safeguarding" value={n(alerts.data?.total)} tone="critical" to="/body-map/review-queue" loading={alerts.isLoading} />
      <Row illustration="adhesive-bandage" label="Body map entries to review" detail="Recorded by carers, not reviewed yet" value={n(queue.data?.total)} to="/body-map/review-queue" loading={queue.isLoading} />
    </>
  )
}

function SuspensionReviewRow() {
  const q = useSuspensionReviewsOverdue(true)
  const rows = q.data ?? []
  return <Row illustration="pause-button" label="Paused visit plans overdue for review" detail="Suspended plans past their review date" value={rows.length} loading={q.isLoading} />
}

function IncidentDecisionRows({ locationId }: { locationId: string | null }) {
  const q = useIncidentStats(locationId ?? undefined, true)
  return (
    <>
      <Row illustration="inbox-tray" label="Incidents not picked up" detail="Reported, no manager assigned yet" value={n(q.data?.notPickedUp)} tone="critical" to="/incidents/dashboard" loading={q.isLoading} />
      <Row illustration="writing-hand" label="Overdue incident actions" detail={`${n(q.data?.actionsRequired)} actions required in total`} value={n(q.data?.overdueActions)} tone="critical" to="/incidents/dashboard" loading={q.isLoading} />
    </>
  )
}

function InitialAssessmentRow({ locationId }: { locationId: string | null }) {
  const q = useInitialAssessmentReviewQueue(locationId, true)
  const count = q.data?.submissions?.length ?? n(q.data?.total)
  return <Row illustration="clipboard" label="Initial assessments to review" detail="Submitted, waiting for a manager" value={count} to="/initial-assessments/review-queue" loading={q.isLoading} />
}

function HoursApprovalRow() {
  const q = useHoursApprovals('PENDING')
  return <Row illustration="stopwatch" label="Hours to approve" detail="Submitted by staff" value={q.data?.length ?? 0} to="/hours-approvals" loading={q.isLoading} />
}

function ExternalTrainingRow({ locationId }: { locationId: string | null }) {
  const q = useLearningDashboard(locationId ?? undefined)
  return <Row illustration="school" label="External training to approve" detail="Courses staff did elsewhere" value={n(q.data?.externalTrainingPending)} to="/learning/external-training" loading={q.isLoading} />
}

function Decisions({ locationId }: { locationId: string | null }) {
  const can = useCan()
  return (
    <Section illustration="hourglass-not-done" id="decisions" title="Waiting for a decision" description="Someone has to act on these">
      <RowList>
        {can('billing.visit_reconciliations.read') ? <ReconciliationDecisionRows key="rec" locationId={locationId} /> : null}
        {can('service_users.read') ? <MedicationReviewRow key="med" locationId={locationId} /> : null}
        {can('incidents.read') ? <IncidentDecisionRows key="inc" locationId={locationId} /> : null}
        {can('service_users.body_map.review', 'service_users.body_map.read', 'service_users.read') ? <BodyMapRows key="bm" locationId={locationId} /> : null}
        {can('employees.compliance.reports.read') ? <ComplianceReviewRow key="comp" locationId={locationId} /> : null}
        {can('service_users.initial_assessment.review') ? <InitialAssessmentRow key="ia" locationId={locationId} /> : null}
        {can('service_users.visit_plan.read', 'service_users.read') ? <SuspensionReviewRow key="susp" /> : null}
        {can('hours_approvals.read', 'hours_approvals.manage') ? <HoursApprovalRow key="hours" /> : null}
        {can('learning.dashboard.read') ? <ExternalTrainingRow key="ext" locationId={locationId} /> : null}
      </RowList>
    </Section>
  )
}

/* ─── 3. Coming up ───────────────────────────────────────────────────────── */

function StaffDocumentRows({ locationId }: { locationId: string | null }) {
  const q = useComplianceSummary(locationId, true)
  return (
    <>
      <Row illustration="identification-card" label="Staff documents expired" detail="DBS, right to work, training and other required documents" value={n(q.data?.expired)} tone="critical" to="/employee/compliance" loading={q.isLoading} />
      <Row illustration="file-folder" label="Required staff documents missing" detail="Never uploaded for staff who need them" value={n(q.data?.missing)} tone="critical" to="/employee/compliance" loading={q.isLoading} />
      <Row illustration="hourglass-not-done" label="Staff documents expiring soon" detail="Renew before they lapse" value={n(q.data?.expiringSoon)} to="/employee/compliance" loading={q.isLoading} />
    </>
  )
}

function CareReviewRows({ locationId, canAssessments }: { locationId: string | null; canAssessments: boolean }) {
  const plans = useCarePlanReviewQueue(locationId, true)
  const assessments = useAssessmentReviewQueue(locationId, canAssessments)
  const pm = plans.data?.meta
  const am = assessments.data?.meta
  return (
    <>
      <Row illustration="memo"
        label="Care plan reviews due"
        detail={n(pm?.overdueCount) ? `${pm?.overdueCount} already overdue` : 'None overdue'}
        value={n(pm?.overdueCount) + n(pm?.dueSoonCount)}
        tone={n(pm?.overdueCount) ? 'critical' : 'warning'}
        to="/care-plans/reviews"
        loading={plans.isLoading}
      />
      {canAssessments ? (
        <Row illustration="check-mark-button"
          label="Assessments due"
          detail={n(am?.overdueCount) ? `${am?.overdueCount} already overdue` : 'None overdue'}
          value={n(am?.overdueCount) + n(am?.dueSoonCount)}
          tone={n(am?.overdueCount) ? 'critical' : 'warning'}
          to="/assessments/review-queue"
          loading={assessments.isLoading}
        />
      ) : null}
    </>
  )
}

type UpcomingKey =
  | 'dols'
  | 'legalAuthorities'
  | 'documents'
  | 'fundingEnding'
  | 'purchaseOrders'
  | 'fundingReviews'
  | 'visitPlanReviews'

const UPCOMING_ILLUSTRATION: Record<UpcomingKey, string> = {
  dols: 'scroll',
  legalAuthorities: 'key',
  documents: 'page-facing-up',
  fundingEnding: 'money-with-wings',
  purchaseOrders: 'receipt',
  fundingReviews: 'magnifying-glass-tilted-left',
  visitPlanReviews: 'spiral-notepad',
}

function ServiceUserExpiryRows({ locationId }: { locationId: string | null }) {
  const q = useServiceUserUpcoming(locationId, UPCOMING_DAYS, true)
  const d = q.data
  const row = (key: UpcomingKey, label: string, extra?: string) => {
    const cat = d?.[key]
    return (
      <Row
        key={key}
        illustration={UPCOMING_ILLUSTRATION[key]}
        testId={`home-upcoming-${key}`}
        label={label}
        detail={[overdueDetail(cat), extra].filter(Boolean).join(' · ')}
        value={n(cat?.count)}
        tone={n(cat?.overdue) ? 'critical' : 'warning'}
        loading={q.isLoading}
        items={upcomingItems(cat)}
      />
    )
  }
  return (
    <>
      {row('dols', 'DoLS authorisations to renew', 'A lapsed DoLS must be reported to the CQC')}
      {row('legalAuthorities', 'Powers of attorney and legal authorities expiring')}
      {row('documents', 'Service user documents expiring')}
      {row('visitPlanReviews', 'Visit plan reviews due')}
      {row('fundingEnding', 'Funding ending', 'Check the package continues')}
      {row('purchaseOrders', 'Purchase orders expiring', 'An expired PO blocks invoicing')}
      {row('fundingReviews', 'Funding reviews due')}
    </>
  )
}

function PolicyReviewRow() {
  const q = usePolicyReviews(UPCOMING_DAYS, true)
  return (
    <Row illustration="ledger"
      label="Policies due for review"
      detail={n(q.data?.overdue) ? `${q.data?.overdue} already overdue` : 'None overdue'}
      value={n(q.data?.count)}
      tone={n(q.data?.overdue) ? 'critical' : 'warning'}
      to="/policies"
      loading={q.isLoading}
      items={(q.data?.items ?? []).map((p) => ({
        id: p.id,
        primary: `${p.reference} · ${p.title}`,
        secondary: `${p.overdue ? 'overdue since' : 'due'} ${dateLabel(p.reviewDate)}`,
        alert: p.overdue,
      }))}
    />
  )
}

function OverdueTrainingRow({ locationId }: { locationId: string | null }) {
  const q = useLearningDashboard(locationId ?? undefined)
  return <Row illustration="books" label="Overdue training" detail={`${plural(n(q.data?.assignments), 'assignment')} in total`} value={n(q.data?.overdueAssignments)} tone="critical" to="/learning/assignments" loading={q.isLoading} />
}

function AppointmentsTodayRow({ locationId }: { locationId: string | null }) {
  const q = useAppointmentsToday(locationId, true)
  const items = q.data?.items ?? []
  return (
    <Row illustration="stethoscope"
      quiet
      label="Service user appointments today"
      detail="GP, hospital and other appointments from the calendar"
      value={n(q.data?.total)}
      to="/service-users/calendar"
      loading={q.isLoading}
      items={items.map((a) => ({
        id: a.id,
        primary: a.serviceUserName,
        secondary: `${a.type} · ${a.allDay ? 'all day' : new Date(a.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
        to: '/service-users/$serviceUserId/profile',
        params: { serviceUserId: a.serviceUserId },
      }))}
    />
  )
}

function ComingUp({ locationId }: { locationId: string | null }) {
  const can = useCan()
  const canSu = can('service_users.read')
  return (
    <Section illustration="tear-off-calendar" id="coming-up" title="Coming up" description={`Due in the next ${UPCOMING_DAYS} days · overdue shown first`}>
      <RowList>
        {can('service_users.calendar.read') ? <AppointmentsTodayRow key="appts" locationId={locationId} /> : null}
        {can('employees.compliance.reports.read') ? <StaffDocumentRows key="docs" locationId={locationId} /> : null}
        {canSu ? <CareReviewRows key="care" locationId={locationId} canAssessments={can('service_users.assessments.read')} /> : null}
        {canSu ? <ServiceUserExpiryRows key="su" locationId={locationId} /> : null}
        {can('learning.dashboard.read') ? <OverdueTrainingRow key="train" locationId={locationId} /> : null}
        {can('policies.read') ? <PolicyReviewRow key="pol" /> : null}
      </RowList>
    </Section>
  )
}

/* ─── 4. Capacity ────────────────────────────────────────────────────────── */

function StaffOffRow({ locationId }: { locationId: string | null }) {
  const q = useStaffOffToday(locationId, true)
  const d = q.data
  const parts = [d?.sickness && `${d.sickness} sick`, d?.holiday && `${d.holiday} on holiday`, d?.unauthorised && `${d.unauthorised} unauthorised`].filter(Boolean)
  return (
    <Row illustration="face-with-thermometer"
      label="Staff off today"
      detail={parts.length ? parts.join(' · ') : 'Everyone is in'}
      value={n(d?.total)}
      tone={d?.unauthorised ? 'critical' : 'warning'}
      to="/employee/absences"
      loading={q.isLoading}
      items={(d?.items ?? []).map((i) => ({
        id: i.employeeId,
        primary: i.name,
        secondary: `${i.reason}${i.sickness ? ' · sick' : ''}${i.unauthorised ? ' · unauthorised' : ''}`,
        alert: i.unauthorised,
      }))}
    />
  )
}

function NextWeekCoverRow() {
  const { locationId } = useGlobalLocationScope()
  // Counted in the database: per-day lists are capped at 200 visits and would undercount.
  const q = useOperationsOverview(locationId, true)
  return (
    <Row illustration="calendar"
      label="Visits needing a carer this week"
      detail={`Next 7 days · ${plural(n(q.data?.cover.visitsNext7), 'visit')} scheduled`}
      value={n(q.data?.cover.unfilledNext7)}
      tone="critical"
      to="/scheduling/schedule-jobs"
      loading={q.isLoading}
    />
  )
}

function ActiveStaffRow() {
  const q = useEmployeeChartSummary()
  return <Row illustration="busts-in-silhouette" quiet label="Active staff" detail={`${n(q.data?.staff?.total)} on record`} value={n(q.data?.staff?.active)} to="/employee/staff-list" loading={q.isLoading} />
}

function Capacity({ locationId }: { locationId: string | null }) {
  const can = useCan()
  return (
    <Section illustration="people-hugging" id="capacity" title="Capacity" description="Who is available to cover the work">
      <RowList>
        {can('employees.read', 'employees.reports.read') ? <StaffOffRow key="off" locationId={locationId} /> : null}
        {can('schedule.read', 'schedules.read', 'scheduled_visits.read', 'scheduled_jobs.read') ? <NextWeekCoverRow key="week" /> : null}
        {can('employees.read') ? <ActiveStaffRow key="active" /> : null}
      </RowList>
    </Section>
  )
}

/* ─── 5. Money ───────────────────────────────────────────────────────────── */

const FINANCE_CODE: Record<string, string> = {
  MISSING_CHECK_IN: 'missing check-in',
  MISSING_CHECK_OUT: 'missing check-out',
  OVERRUN: 'overrun',
  UNDERRUN: 'underrun',
  GPS_MISMATCH: 'GPS mismatch',
  RATE_MISSING: 'rate missing',
  CHARGE_CARD_MISSING: 'charge card missing',
  PAY_CARD_MISSING: 'pay card missing',
  TASKS_INCOMPLETE: 'tasks incomplete',
  FUNDING_SETUP_INCOMPLETE: 'funding not set up',
  PO_EXPIRED: 'PO expired',
  PO_MISSING: 'PO missing',
}

function BillingRows({ locationId }: { locationId: string | null }) {
  const recon = useVisitReconciliationsSummary(locationId)
  const queue = useFinanceExceptionQueue(true)
  const funding = useFundingContractsSummary(locationId)
  const counts = new Map<string, number>()
  for (const r of queue.data ?? []) counts.set(r.code, (counts.get(r.code) ?? 0) + 1)
  const breakdown = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([code, c]) => `${c} ${FINANCE_CODE[code] ?? code.toLowerCase().replace(/_/g, ' ')}`)
    .join(' · ')
  return (
    <>
      <Row illustration="no-entry" label="Service users not ready to invoice" detail="No ready funding contract (missing or incomplete)" value={n(funding.data?.missingFundingContracts)} tone="critical" to="/billing" loading={funding.isLoading} />
      <Row illustration="balance-scale" label="Visits with finance exceptions" detail={breakdown || 'Nothing blocking billing or pay'} value={n(recon.data?.visitsWithExceptions)} to="/billing/visit-reconciliation" loading={recon.isLoading} />
      <Row illustration="pound-banknote" quiet label="Visits ready to bill" detail="Reconciled and approved" value={n(recon.data?.visitsReady)} to="/billing/visit-reconciliation" loading={recon.isLoading} />
    </>
  )
}

function InvoiceRows({ locationId, canPayments }: { locationId: string | null; canPayments: boolean }) {
  const inv = useInvoiceRunsSummary(locationId)
  const pay = usePaymentsSummary()
  return (
    <>
      <Row illustration="receipt" label="Invoice runs in draft" detail="Not issued yet" value={n(inv.data?.invoiceDrafts)} to="/billing/invoice-runs" loading={inv.isLoading} />
      {canPayments ? (
        <>
          <Row illustration="credit-card" label="Overdue invoices" detail="Past their due date, unpaid" value={n(pay.data?.overdueInvoices)} tone="critical" to="/billing" loading={pay.isLoading} />
          <Row illustration="coin" label="Unmatched payments" detail="Money received, not matched to an invoice" value={n(pay.data?.unmatchedPayments)} to="/billing" loading={pay.isLoading} />
        </>
      ) : null}
    </>
  )
}

function PayrollRow() {
  const q = usePayrollOverview()
  return <Row illustration="bank" label="Open UK payroll runs" detail={`${n(q.data?.readyEmployeeProfiles)} employees ready for payroll`} value={n(q.data?.openRuns)} to="/payroll/runs" loading={q.isLoading} />
}

function Money({ locationId }: { locationId: string | null }) {
  const can = useCan()
  const canRecon = can('billing.visit_reconciliations.read')
  const canInvoices = can('billing.invoice_runs.read')
  const canPayments = can('billing.payments.read')
  const canPayroll = can('payroll.runs.read', 'payroll.settings.read')
  if (!canRecon && !canInvoices && !canPayments && !canPayroll) return null
  return (
    <Section illustration="money-bag" id="money" title="Money" description="What is blocking billing and pay">
      <RowList>
        {canRecon ? <BillingRows key="bill" locationId={locationId} /> : null}
        {canInvoices ? <InvoiceRows key="inv" locationId={locationId} canPayments={canPayments} /> : null}
        {canPayroll ? <PayrollRow key="pay" /> : null}
      </RowList>
    </Section>
  )
}

/* ─── 6. Organisation ────────────────────────────────────────────────────── */

function SetupRow() {
  const q = useSetupChecklist()
  const s = q.data?.summary
  const left = Math.max(0, n(s?.total) - n(s?.complete))
  return <Row illustration="check-box-with-check" label="Setup steps left" detail={`${n(s?.complete)} of ${n(s?.total)} complete`} value={left} tone="warning" to="/checklist" loading={q.isLoading} />
}

function Organisation() {
  const can = useCan()
  if (!can('setup_checklist.read')) return null
  return (
    <Section illustration="office-building" id="organisation" title="Organisation" description="Getting Careflow fully set up">
      <RowList>
        <SetupRow />
      </RowList>
    </Section>
  )
}

/* ─── Every module at a glance ───────────────────────────────────────────── */

/** One card per module the user can open, with that module's key facts (same figures as its dashboard). */
function ModulesAtAGlance() {
  const can = useAuthStore((s) => s.can)
  const role = useAuthStore((s) => s.user?.role)
  const modules = React.useMemo(
    () =>
      filterNavByPermission(adminNavItems, can, role).filter((m) => {
        const meta = NAV_MODULES[m.label]
        return meta ? hasModuleDashboard(meta.slug) : false
      }),
    [can, role],
  )
  if (modules.length === 0) return null
  return (
    <Section id="modules" illustration="bar-chart" title="Every module at a glance" description="Quick facts · select any figure to open it">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3" data-testid="home-modules">
        {modules.map((m) => {
          const meta = NAV_MODULES[m.label]!
          return (
            <section
              key={m.label}
              aria-label={`${m.label} quick facts`}
              data-testid={`home-module-${meta.slug}`}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <header className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                  <ModuleIllustration label={m.label} fallback={<meta.Icon className="h-5 w-5" />} className="h-8 w-8" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-foreground">{m.label}</h3>
                  <p className="truncate text-xs text-muted-foreground">{meta.description}</p>
                </div>
                <Link
                  to={moduleLandingPath(m.label)!}
                  className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                >
                  Open <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </header>
              <ModuleSnapshot slug={meta.slug} />
            </section>
          )
        })}
      </div>
    </Section>
  )
}

/* ─── Overview ───────────────────────────────────────────────────────────── */

export function HomeOverview() {
  const { locationId } = useGlobalLocationScope()
  const loc = locationId ?? null
  return (
    <div className="space-y-6" data-testid="home-overview">
      <YouStrip />
      <RightNow locationId={loc} />
      <ModulesAtAGlance />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Decisions locationId={loc} />
        <ComingUp locationId={loc} />
        <Capacity locationId={loc} />
        <Money locationId={loc} />
        <Organisation />
      </div>
    </div>
  )
}
