import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { cn, formatCurrency } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import type { Permission } from '@/features/auth/types'
import { illustrationSrc } from '@/components/layout/nav-illustrations'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import type { ListServiceUsersParams } from '@/features/service-users/api'
import { useEcmExceptions, useEcmLiveDashboard } from '@/features/ecm/hooks/useEcm'
import { useHousekeepingJobsNeedingAttention, useScheduleList } from '@/features/scheduling/hooks/useScheduling'
import { useEmployeeChartSummary } from '@/features/employees/hooks/useEmployees'
import { useHoursApprovals } from '@/features/hours-approvals/hooks'
import { useLearningDashboard } from '@/features/learning/hooks/useLearning'
import { useIncidentStats } from '@/features/incidents/hooks/useIncidents'
import { useFeedbackSummary } from '@/features/complaints/hooks/useComplaints'
import { useVisitReconciliationsSummary } from '@/features/billing/hooks/useVisitReconciliations'
import { useInvoiceRunsSummary } from '@/features/billing/hooks/useInvoiceRuns'
import { usePaymentsSummary } from '@/features/billing/hooks/usePayments'
import { useFundingContractsSummary } from '@/features/billing/hooks/useFundingContracts'
import { usePayrollRunsSummary } from '@/features/billing/hooks/usePayrollRuns'
import { usePayrollOverview } from '@/features/payroll/hooks/usePayroll'
import { useRecruitmentSummary } from '@/features/hr/recruitment/hooks/useRecruitment'
import { useSetupChecklist } from '@/features/setup-checklist/hooks'
import { useMedicationOverview } from '@/features/emar/hooks/useEmar'
import {
  useAssessmentReviewQueue,
  useBodyMapGovernanceAlerts,
  useBodyMapReviewQueue,
  useComplianceSummary,
  useFinanceExceptionQueue,
  useLateMedicationToday,
  useMedicationExceptionsToday,
  usePolicyReviews,
  useServiceUserUpcoming,
  useStaffOffToday,
  useSuspensionReviewsOverdue,
  useVisitsNeedingCarersNextWeek,
} from '@/features/home/hooks/useHomeSignals'

/*
 * Comprehensive module dashboards for /apps/<module>.
 * Each module is a set of themed KPI groups. A tile is either
 *   - live: computed from an existing endpoint, linking to the records behind it, or
 *   - planned: a KPI we do not track yet, shown dashed with what is needed to switch it on.
 * Groups only render (and only fetch) when the user has the permission behind them.
 */

/* ─── Building blocks ────────────────────────────────────────────────────── */

type Tone = 'bad' | 'warn' | 'good' | 'neutral' | 'muted'

const TONE_TEXT: Record<Tone, string> = {
  bad: 'text-rose-600 dark:text-rose-400',
  warn: 'text-amber-600 dark:text-amber-400',
  good: 'text-emerald-600 dark:text-emerald-400',
  neutral: 'text-foreground',
  muted: 'text-muted-foreground/70',
}
const TONE_BAR: Record<Tone, string> = {
  bad: 'bg-rose-500',
  warn: 'bg-amber-500',
  good: 'bg-emerald-500',
  neutral: 'bg-primary/70',
  muted: 'bg-muted-foreground/40',
}

/** Attention colour only when there is something to act on. */
const attn = (n: number | undefined | null, tone: 'bad' | 'warn') => ((n ?? 0) > 0 ? tone : 'muted')
const n0 = (v: number | undefined | null) => v ?? 0
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null)
const monthStartIso = () => `${operationalTodayIso().slice(0, 8)}01`

function useCan() {
  const can = useAuthStore((s) => s.can)
  return React.useCallback((...perms: Permission[]) => perms.some((p) => can(p)), [can])
}

function Art({ name, className }: { name: string; className?: string }) {
  return (
    <img
      src={illustrationSrc(name)}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn('shrink-0 select-none object-contain', className)}
    />
  )
}

function Kpi({
  label,
  value,
  hint,
  art,
  tone = 'neutral',
  to,
  loading,
  progress,
}: {
  label: string
  value: number | string | null | undefined
  hint?: string
  art: string
  tone?: Tone
  to?: string
  loading?: boolean
  /** 0–100: draws a bar under the value (for percentages). */
  progress?: number | null
}) {
  const shown = loading ? '…' : value === null || value === undefined ? '—' : value
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Art name={art} className={cn('h-8 w-8', tone === 'muted' && 'opacity-50 grayscale')} />
      </div>
      <span className={cn('-mt-1 text-2xl font-bold tabular-nums leading-none', TONE_TEXT[tone])}>{shown}</span>
      {progress !== undefined && progress !== null ? (
        <span className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <span className={cn('block h-full rounded-full', TONE_BAR[tone])} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </span>
      ) : null}
      {hint ? <span className="mt-1 text-xs leading-snug text-muted-foreground">{hint}</span> : null}
    </>
  )
  const cls = 'group flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-3.5 shadow-sm'
  return to ? (
    <Link to={to} className={cn(cls, 'transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** A KPI we do not track yet: dashed, with what it would take to switch on. */
function Planned({ label, art, needs }: { label: string; art: string; needs: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-dashed border-border bg-muted/20 p-3.5" data-testid="kpi-planned">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Art name={art} className="h-8 w-8 opacity-45 grayscale-[60%]" />
      </div>
      <span className="-mt-1 text-2xl font-bold leading-none text-muted-foreground/50">—</span>
      <span className="mt-1 inline-flex w-fit rounded-full bg-amber-100/80 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        Not tracked yet
      </span>
      <span className="text-xs leading-snug text-muted-foreground">{needs}</span>
    </div>
  )
}

function Group({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h3 className="font-display text-[15px] font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{children}</div>
    </section>
  )
}

/** Count of service users matching list filters (limit 1, reads meta.total). */
function useSuCount(filters: Partial<ListServiceUsersParams>, enabled = true) {
  const { locationId } = useGlobalLocationScope()
  const q = useServiceUsers({ page: 1, limit: 1, locationId: locationId ?? undefined, ...filters }, enabled)
  return { value: enabled ? q.data?.meta?.total : undefined, loading: enabled && q.isLoading }
}

/* ─── Service users ──────────────────────────────────────────────────────── */

function ServiceUsersInsights() {
  const can = useCan()
  const lookupsQ = useServiceUserLookups()
  const lookups = lookupsQ.data
  const ready = !!lookups
  const statusId = (code: string) => lookups?.statuses.find((s) => s.code === code)?.id
  const riskId = (code: string) => lookups?.riskLevels.find((r) => r.code === code)?.id
  const monthStart = monthStartIso()
  const today = operationalTodayIso()

  const active = useSuCount({ statusId: statusId('ACTIVE') }, ready)
  const onHold = useSuCount({ statusId: statusId('ON_HOLD'), showInactive: true }, ready)
  const discharged = useSuCount({ statusId: statusId('DISCHARGED'), showInactive: true }, ready)
  const newStarts = useSuCount({ serviceStartDateFrom: monthStart })
  const hospital = useSuCount({ hospitalisedOnly: true })
  const noKw = useSuCount({ unassignedKeyWorker: true })
  const flash = useSuCount({ hasActiveFlashMessage: true })

  const low = useSuCount({ riskLevelId: riskId('LOW') }, ready)
  const medium = useSuCount({ riskLevelId: riskId('MEDIUM') }, ready)
  const high = useSuCount({ riskLevelId: riskId('HIGH') }, ready)
  const critical = useSuCount({ riskLevelId: riskId('CRITICAL') }, ready)
  const loneWorker = useSuCount({ loneWorkerRisk: true })
  const safeguarding = useSuCount({ safeguardingHistory: true })

  const iaNone = useSuCount({ initialAssessmentStatus: 'none' })
  const iaProgress = useSuCount({ initialAssessmentStatus: 'in_progress' })
  const iaReview = useSuCount({ initialAssessmentStatus: 'awaiting_review' })
  const iaDone = useSuCount({ initialAssessmentStatus: 'completed' })
  const cpNone = useSuCount({ carePlanListStatus: 'none' })
  const cpOverdue = useSuCount({ carePlanListStatus: 'overdue' })
  const cpWeek = useSuCount({ carePlanListStatus: 'due_within_week' })
  const missedMonth = useSuCount({ missedVisitsMin: 1, missedVisitsFrom: monthStart, missedVisitsTo: today })

  const { locationId } = useGlobalLocationScope()
  const assessments = useAssessmentReviewQueue(locationId, can('service_users.assessments.read'))
  const bodyMap = useBodyMapReviewQueue(locationId, true)
  const bodyMapAlerts = useBodyMapGovernanceAlerts(true)
  const meds = useMedicationExceptionsToday(locationId, true)
  const upcoming = useServiceUserUpcoming(locationId, 30, true)
  const suspensions = useSuspensionReviewsOverdue(true)
  const u = upcoming.data

  const activeN = n0(active.value)
  const coverage = activeN ? pct(activeN - n0(cpNone.value), activeN) : null
  const iaCoverage = activeN ? pct(n0(iaDone.value), activeN) : null

  return (
    <>
      <Group title="Caseload" description="Who you support and where they are">
        <Kpi label="Active service users" value={active.value} art="older-person" loading={active.loading} to="/service-users/all" hint="Receiving care now" />
        <Kpi label="New starts this month" value={newStarts.value} art="sparkles" tone="good" loading={newStarts.loading} to="/service-users/all" hint="Service started since the 1st" />
        <Kpi label="On hold" value={onHold.value} art="pause-button" tone={attn(onHold.value, 'warn')} loading={onHold.loading} to="/service-users/all" hint="Care paused" />
        <Kpi label="In hospital" value={hospital.value} art="hospital" tone={attn(hospital.value, 'warn')} loading={hospital.loading} to="/service-users/all" hint="Currently hospitalised" />
        <Kpi label="Discharged" value={discharged.value} art="door" tone="neutral" loading={discharged.loading} to="/service-users/all" hint="Service ended" />
        <Kpi label="No key worker" value={noKw.value} art="identification-card" tone={attn(noKw.value, 'warn')} loading={noKw.loading} to="/service-users/all" hint="Need a key worker assigned" />
        <Kpi label="Active flash messages" value={flash.value} art="megaphone" tone={attn(flash.value, 'warn')} loading={flash.loading} to="/service-users/all" hint="Shown to carers on visits" />
        <Planned label="Contracted vs delivered hours" art="hourglass-not-done" needs="Weekly commissioned hours per service user compared with delivered visit time." />
      </Group>

      <Group title="Risk profile" description="Matches the coloured ring on each service user's photo">
        <Kpi label="Low risk" value={low.value} art="green-heart" tone="good" loading={low.loading} to="/service-users/all" />
        <Kpi label="Medium risk" value={medium.value} art="yellow-heart" tone={attn(medium.value, 'warn')} loading={medium.loading} to="/service-users/all" />
        <Kpi label="High risk" value={high.value} art="orange-heart" tone={attn(high.value, 'bad')} loading={high.loading} to="/service-users/all" />
        <Kpi label="Critical risk" value={critical.value} art="heart-exclamation" tone={attn(critical.value, 'bad')} loading={critical.loading} to="/service-users/all" />
        <Kpi label="Lone worker risk" value={loneWorker.value} art="person-walking" tone={attn(loneWorker.value, 'warn')} loading={loneWorker.loading} to="/service-users/all" hint="Flagged in the initial assessment" />
        <Kpi label="Safeguarding history" value={safeguarding.value} art="heart-hands" tone={attn(safeguarding.value, 'warn')} loading={safeguarding.loading} to="/service-users/all" />
      </Group>

      <Group title="Assessment & care planning" description="Coverage and what is due">
        <Kpi label="Care plan coverage" value={coverage === null ? null : `${coverage}%`} progress={coverage} art="memo" tone={coverage === null ? 'neutral' : coverage >= 95 ? 'good' : coverage >= 80 ? 'warn' : 'bad'} loading={cpNone.loading || active.loading} hint={`${n0(cpNone.value)} active service users without a care plan`} to="/care-plans/reviews" />
        <Kpi label="Initial assessments complete" value={iaCoverage === null ? null : `${iaCoverage}%`} progress={iaCoverage} art="clipboard" tone={iaCoverage === null ? 'neutral' : iaCoverage >= 95 ? 'good' : 'warn'} loading={iaDone.loading || active.loading} hint={`${n0(iaDone.value)} completed`} to="/service-users/initial-assessment" />
        <Kpi label="Assessments not started" value={iaNone.value} art="page-facing-up" tone={attn(iaNone.value, 'warn')} loading={iaNone.loading} to="/service-users/initial-assessment" />
        <Kpi label="Assessments in progress" value={iaProgress.value} art="writing-hand" loading={iaProgress.loading} to="/service-users/initial-assessment" />
        <Kpi label="Waiting for review" value={iaReview.value} art="magnifying-glass-tilted-left" tone={attn(iaReview.value, 'warn')} loading={iaReview.loading} to="/initial-assessments/review-queue" />
        <Kpi label="Care plan reviews overdue" value={cpOverdue.value} art="memo" tone={attn(cpOverdue.value, 'bad')} loading={cpOverdue.loading} to="/care-plans/reviews" hint={`${n0(cpWeek.value)} due within a week`} />
        {can('service_users.assessments.read') ? (
          <Kpi label="Scheduled assessments overdue" value={assessments.data?.meta?.overdueCount} art="check-mark-button" tone={attn(assessments.data?.meta?.overdueCount, 'bad')} loading={assessments.isLoading} to="/assessments/review-queue" hint={`${n0(assessments.data?.meta?.dueSoonCount)} due soon`} />
        ) : null}
        <Kpi label="Paused plans overdue review" value={suspensions.data?.length} art="spiral-notepad" tone={attn(suspensions.data?.length, 'warn')} loading={suspensions.isLoading} />
      </Group>

      <Group title="Safety & wellbeing" description="Signals that someone may need extra support">
        <Kpi label="Missed a visit this month" value={missedMonth.value} art="cross-mark" tone={attn(missedMonth.value, 'bad')} loading={missedMonth.loading} to="/service-users/all" hint="Service users with at least one missed visit" />
        <Kpi label="Doses not given today" value={meds.data?.total} art="pill" tone={attn(meds.data?.total, 'bad')} loading={meds.isLoading} hint={`${n0(meds.data?.awaitingReview)} not reviewed by a manager`} to="/medication/exceptions" />
        <Kpi label="Body map safeguarding alerts" value={bodyMapAlerts.data?.total} art="heart-hands" tone={attn(bodyMapAlerts.data?.total, 'bad')} loading={bodyMapAlerts.isLoading} to="/body-map/review-queue" />
        <Kpi label="Body map entries to review" value={bodyMap.data?.total} art="adhesive-bandage" tone={attn(bodyMap.data?.total, 'warn')} loading={bodyMap.isLoading} to="/body-map/review-queue" />
        <Kpi label="DoLS to renew (30 days)" value={u?.dols.count} art="scroll" tone={attn(u?.dols.overdue, 'bad')} loading={upcoming.isLoading} hint={`${n0(u?.dols.overdue)} overdue`} />
        <Kpi label="Legal authorities expiring" value={u?.legalAuthorities.count} art="key" tone={attn(u?.legalAuthorities.overdue, 'bad')} loading={upcoming.isLoading} hint={`${n0(u?.legalAuthorities.overdue)} overdue`} />
        <Kpi label="Documents expiring" value={u?.documents.count} art="page-facing-up" tone={attn(u?.documents.overdue, 'bad')} loading={upcoming.isLoading} hint={`${n0(u?.documents.overdue)} overdue`} />
        <Planned label="Falls (last 30 days)" art="adhesive-bandage" needs="Link fall incidents to service users and count them over a rolling window." />
        <Planned label="Hospital admissions this month" art="ambulance" needs="Record admission and discharge dates when a service user goes into hospital." />
        <Planned label="Weight & nutrition alerts" art="red-apple" needs="Trend observations (weight, fluid intake) against each service user's usual range." />
        <Planned label="Satisfaction score" art="glowing-star" needs="A standard service user survey question scored 1–5, averaged per quarter." />
      </Group>

      <Group title="Referral pipeline" description="New business coming in">
        <Planned label="Open referrals" art="inbox-tray" needs="An organisation-wide referrals list (referrals are recorded per service user today)." />
        <Planned label="Referral conversion rate" art="chart-increasing" needs="Referral outcome (accepted / declined) across all referrals." />
        <Planned label="Days from referral to first visit" art="stopwatch" needs="Referral received date compared with the first completed visit." />
        <Planned label="Quotations awaiting reply" art="receipt" needs="An organisation-wide view of private quotations and their status." />
      </Group>
    </>
  )
}

/* ─── Care operations ────────────────────────────────────────────────────── */

const SCHEDULE_READ: Permission[] = ['schedule.read', 'schedules.read', 'scheduled_visits.read', 'scheduled_jobs.read']

function CareOperationsInsights() {
  const can = useCan()
  const canEcm = can('ecm.read', 'ecm.monitor')
  const canSchedule = can(...SCHEDULE_READ)
  const canMeds = can('service_users.read')
  const canRecon = can('billing.visit_reconciliations.read')
  const today = operationalTodayIso()
  const { locationId } = useGlobalLocationScope()

  const live = useEcmLiveDashboard({ dateFrom: today, dateTo: today, locationId: locationId ?? undefined, enabled: canEcm })
  const exceptions = useEcmExceptions({ limit: 200, locationId: locationId ?? undefined, enabled: canEcm })
  const todayJobs = useScheduleList(today, canSchedule)
  const week = useVisitsNeedingCarersNextWeek(canSchedule)
  const housekeeping = useHousekeepingJobsNeedingAttention(1)
  const meds = useMedicationExceptionsToday(locationId, canMeds)
  const late = useLateMedicationToday(canMeds)
  const recon = useVisitReconciliationsSummary(canRecon ? locationId : undefined)

  const s = live.data?.summary
  const jobs = todayJobs.data?.jobs ?? []
  const kinds = (k: string[]) => (exceptions.data ?? []).filter((r) => k.includes(String(r.kind))).length
  const onTime = s?.completedOnTimePct ?? null
  const completionPct = s && s.total ? pct(s.completed, s.total) : null
  const b = meds.data?.byStatus

  return (
    <>
      {canEcm ? (
        <Group title="Today, live" description="Electronic call monitoring · refreshes every minute">
          <Kpi label="Visits today" value={s?.total} art="spiral-calendar" loading={live.isLoading} to="/ecm/live" hint={`${n0(s?.inProgress)} in progress now`} />
          <Kpi label="Completed" value={completionPct === null ? s?.completed : `${completionPct}%`} progress={completionPct} art="check-mark-button" tone="good" loading={live.isLoading} to="/ecm/live" hint={`${n0(s?.completed)} of ${n0(s?.total)} visits`} />
          <Kpi label="On time" value={onTime === null ? null : `${onTime}%`} progress={onTime} art="stopwatch" tone={onTime === null ? 'neutral' : onTime >= 90 ? 'good' : onTime >= 75 ? 'warn' : 'bad'} loading={live.isLoading} to="/ecm/live" hint={`${n0(s?.completedLate)} completed late`} />
          <Kpi label="Missed visits" value={n0(s?.confirmedMissed) + n0(s?.potentialMissed)} art="cross-mark" tone={attn(n0(s?.confirmedMissed) + n0(s?.potentialMissed), 'bad')} loading={live.isLoading} to="/ecm/live" hint={`${n0(s?.confirmedMissed)} confirmed · ${n0(s?.potentialMissed)} at risk`} />
          <Kpi label="Not checked in" value={s?.missingCheckIn} art="alarm-clock" tone={attn(s?.missingCheckIn, 'warn')} loading={live.isLoading} to="/ecm/live" hint="Start time passed, no check-in" />
          <Kpi label="Not checked out" value={s?.missingCheckout} art="door" tone={attn(s?.missingCheckout, 'warn')} loading={live.isLoading} to="/ecm/live" />
        </Group>
      ) : null}

      {canSchedule ? (
        <Group title="Cover & allocation" description="Are all visits covered?">
          <Kpi label="Need carers today" value={jobs.filter((j) => j.underAllocated || j.needsCover).length} art="woman-health-worker" tone={attn(jobs.filter((j) => j.underAllocated || j.needsCover).length, 'bad')} loading={todayJobs.isLoading} to="/scheduling/schedule-jobs" />
          <Kpi label="Need carers, next 7 days" value={week.needCarers} art="calendar" tone={attn(week.needCarers, 'bad')} loading={week.isLoading} to="/scheduling/schedule-jobs" hint={`${week.total} visits scheduled`} />
          <Kpi label="Time-critical visits today" value={jobs.filter((j) => j.timeSensitive?.hasAny).length} art="alarm-clock" tone="neutral" loading={todayJobs.isLoading} to="/scheduling/schedule-jobs" hint="Time-sensitive medicine or task" />
          <Kpi label="Service user away today" value={jobs.filter((j) => j.serviceUserAbsent).length} art="pause-button" tone="neutral" loading={todayJobs.isLoading} to="/scheduling/schedule-jobs" hint="Visits affected by an absence" />
          <Kpi label="Jobs needing attention" value={housekeeping.data?.meta?.total} art="warning" tone={attn(housekeeping.data?.meta?.total, 'warn')} loading={housekeeping.isLoading} to="/scheduling/jobs" />
          <Planned label="Continuity of care" art="handshake" needs="Share of visits done by a service user's regular carers over the last 4 weeks." />
          <Planned label="Rota utilisation" art="bar-chart" needs="Scheduled hours compared with carers' contracted hours this week." />
        </Group>
      ) : null}

      {canEcm ? (
        <Group title="Alerts from carers" description="Open alerts raised during visits">
          <Kpi label="SOS" value={kinds(['CARER_SOS'])} art="sos-button" tone={attn(kinds(['CARER_SOS']), 'bad')} loading={exceptions.isLoading} to="/ecm/live" />
          <Kpi label="Left the visit area" value={kinds(['LEFT_VISIT_AREA', 'OUTSIDE_GEOFENCE'])} art="round-pushpin" tone={attn(kinds(['LEFT_VISIT_AREA', 'OUTSIDE_GEOFENCE']), 'warn')} loading={exceptions.isLoading} to="/ecm/live" />
          <Kpi label="Unable to start" value={kinds(['UNABLE_TO_START'])} art="no-entry" tone={attn(kinds(['UNABLE_TO_START']), 'warn')} loading={exceptions.isLoading} to="/ecm/live" />
          <Kpi label="Check-in requests" value={kinds(['OUTSIDE_AREA_CHECK_IN_REQUEST', 'MANUAL_ATTENDANCE'])} art="mobile-phone" tone={attn(kinds(['OUTSIDE_AREA_CHECK_IN_REQUEST', 'MANUAL_ATTENDANCE']), 'warn')} loading={exceptions.isLoading} to="/ecm/live" />
          <Kpi label="Suspicious location" value={kinds(['MOCK_LOCATION'])} art="magnifying-glass-tilted-right" tone={attn(kinds(['MOCK_LOCATION']), 'bad')} loading={exceptions.isLoading} to="/ecm/live" hint="Faked GPS detected" />
        </Group>
      ) : null}

      {canMeds ? (
        <Group title="Medication today" description="Doses recorded on visits">
          <Kpi label="Missed" value={b?.MISSED} art="pill" tone={attn(b?.MISSED, 'bad')} loading={meds.isLoading} to="/medication/exceptions" />
          <Kpi label="Refused" value={b?.REFUSED} art="no-entry" tone={attn(b?.REFUSED, 'warn')} loading={meds.isLoading} to="/medication/exceptions" />
          <Kpi label="Not given" value={b?.NOT_GIVEN} art="cross-mark" tone={attn(b?.NOT_GIVEN, 'bad')} loading={meds.isLoading} to="/medication/exceptions" />
          <Kpi label="Held" value={b?.HELD} art="pause-button" tone={attn(b?.HELD, 'warn')} loading={meds.isLoading} to="/medication/exceptions" />
          <Kpi label="Given late" value={late.data} art="alarm-clock" tone={attn(late.data, 'warn')} loading={late.isLoading} to="/medication/late" />
          <Kpi label="Not reviewed by a manager" value={meds.data?.awaitingReview} art="magnifying-glass-tilted-left" tone={attn(meds.data?.awaitingReview, 'bad')} loading={meds.isLoading} to="/medication/exceptions" />
        </Group>
      ) : null}

      {canRecon ? (
        <Group title="Visit reconciliation" description="Planned vs actual before billing and pay">
          <Kpi label="Waiting for review" value={recon.data?.pendingReview} art="balance-scale" tone={attn(recon.data?.pendingReview, 'warn')} loading={recon.isLoading} to="/billing/visit-reconciliation" />
          <Kpi label="Need manager approval" value={recon.data?.requiresManagerApproval} art="check-mark-button" tone={attn(recon.data?.requiresManagerApproval, 'bad')} loading={recon.isLoading} to="/billing/visit-reconciliation" hint="Overruns and changes" />
          <Kpi label="With exceptions" value={recon.data?.visitsWithExceptions} art="warning" tone={attn(recon.data?.visitsWithExceptions, 'warn')} loading={recon.isLoading} to="/billing/visit-reconciliation" />
          <Kpi label="Ready" value={recon.data?.visitsReady} art="check-box-with-check" tone="good" loading={recon.isLoading} to="/billing/visit-reconciliation" />
        </Group>
      ) : null}

      <Group title="Efficiency" description="Planned KPIs for running a tighter rota">
        <Planned label="Average travel between visits" art="motorway" needs="Travel time from route planning or check-out → next check-in gaps." />
        <Planned label="Mileage per visit" art="round-pushpin" needs="Mileage claims linked to visits." />
        <Planned label="Overrun minutes this week" art="hourglass-done" needs="Sum of actual minus planned time on approved overruns." />
        <Planned label="Cancellations this week" art="wastebasket" needs="Call-offs and cancellations counted by reason." />
      </Group>
    </>
  )
}

/* ─── Medication (eMAR) ──────────────────────────────────────────────────── */

function MedicationInsights() {
  const can = useCan()
  const ok = can('service_users.read')
  const { locationId } = useGlobalLocationScope()
  const q = useMedicationOverview(locationId, 30, ok)
  const d = q.data
  const L = q.isLoading
  const t = d?.today.byStatus
  const p = d?.doses
  const m = d?.medicines
  const sup = d?.support
  const pk = d?.packs
  const pctTone = (v: number | null | undefined, good = 95, warn = 85): Tone =>
    v === null || v === undefined ? 'neutral' : v >= good ? 'good' : v >= warn ? 'warn' : 'bad'

  if (!ok) return null
  return (
    <>
      <Group title="Today" description="Doses recorded on visits so far today · refreshes every minute">
        <Kpi label="Doses recorded" value={d?.today.recorded} art="clipboard" loading={L} to="/medication/administered" hint={`${n0(t?.GIVEN)} given`} />
        <Kpi label="Missed" value={t?.MISSED} art="cross-mark" tone={attn(t?.MISSED, 'bad')} loading={L} to="/medication/exceptions" />
        <Kpi label="Refused" value={t?.REFUSED} art="no-entry" tone={attn(t?.REFUSED, 'warn')} loading={L} to="/medication/exceptions" />
        <Kpi label="Not given" value={t?.NOT_GIVEN} art="pill" tone={attn(t?.NOT_GIVEN, 'bad')} loading={L} to="/medication/exceptions" />
        <Kpi label="Held" value={t?.HELD} art="pause-button" tone={attn(t?.HELD, 'warn')} loading={L} to="/medication/exceptions" hint="Withheld on instruction" />
      </Group>

      <Group title="Administration · last 30 days" description="How reliably medicines are given">
        <Kpi label="Doses given" value={p?.givenPct === null || p?.givenPct === undefined ? null : `${p.givenPct}%`} progress={p?.givenPct} art="check-mark-button" tone={pctTone(p?.givenPct)} loading={L} to="/medication/administered" hint={`${n0(p?.byStatus.GIVEN).toLocaleString('en-GB')} of ${n0(p?.recorded).toLocaleString('en-GB')} recorded doses`} />
        <Kpi label="Given on time" value={p?.onTimePct === null || p?.onTimePct === undefined ? null : `${p.onTimePct}%`} progress={p?.onTimePct} art="stopwatch" tone={pctTone(p?.onTimePct, 90, 75)} loading={L} to="/medication/late" hint="Within each medicine's time window" />
        <Kpi label="Given late" value={p?.late} art="alarm-clock" tone={attn(p?.late, 'warn')} loading={L} to="/medication/late" hint={`${n0(p?.early)} given early`} />
        <Kpi label="Time-critical given late" value={p?.timeCriticalLate} art="red-exclamation-mark" tone={attn(p?.timeCriticalLate, 'bad')} loading={L} to="/medication/late" hint="For example Parkinson's or insulin" />
        <Kpi label="Missed or refused" value={p?.exceptions} art="cross-mark" tone={attn(p?.exceptions, 'warn')} loading={L} to="/medication/exceptions" hint={`${n0(p?.byStatus.MISSED)} missed · ${n0(p?.byStatus.REFUSED)} refused`} />
        <Kpi label="Not reviewed by a manager" value={p?.awaitingReview} art="magnifying-glass-tilted-left" tone={attn(p?.awaitingReview, 'bad')} loading={L} to="/medication/exceptions" hint="Exceptions with no manager review yet" />
        <Kpi label="PRN doses given" value={p?.prnGiven} art="hourglass-not-done" loading={L} to="/medication/administered" hint="As-needed medicines" />
      </Group>

      <Group title="Controlled drugs" description="Higher-risk medicines that need a witness">
        <Kpi label="Controlled drugs on record" value={m?.controlled} art="locked" loading={L} />
        <Kpi label="Controlled doses given (30 days)" value={p?.controlledGiven} art="syringe" loading={L} to="/medication/administered" />
        <Kpi label="Given without a witness" value={p?.controlledWithoutWitness} art="warning" tone={attn(p?.controlledWithoutWitness, 'bad')} loading={L} to="/medication/administered" hint="No witness recorded on the visit" />
        <Planned label="Running balance checks" art="balance-scale" needs="A controlled drugs register with a balance after every dose and weekly stock checks." />
      </Group>

      <Group title="Medicines on record" description="What service users are prescribed">
        <Kpi label="Service users on medication" value={m?.serviceUsersOnMedication} art="older-person" loading={L} to="/service-users/all" />
        <Kpi label="Active medicines" value={m?.active} art="pill" loading={L} hint={`${n0(m?.regular)} regular · ${n0(m?.prn)} PRN`} />
        <Kpi label="Time-critical medicines" value={m?.timeCritical} art="alarm-clock" loading={L} hint="Must be given within a tight window" />
        <Kpi label="Ending in 14 days" value={m?.endingSoon} art="hourglass-done" tone={attn(m?.endingSoon, 'warn')} loading={L} hint="Check for a new prescription" />
        <Kpi label="Past expiry date" value={m?.expired} art="wastebasket" tone={attn(m?.expired, 'bad')} loading={L} hint="Still active with an expired supply" />
        <Kpi label="Allergies recorded" value={d?.allergies.onMedicationWithAllergies} art="warning" loading={L} hint={`Of ${n0(m?.serviceUsersOnMedication)} on medication · ${n0(d?.allergies.serviceUsersWithAllergies)} across all service users`} />
      </Group>

      <Group title="Support levels" description="How each person on medication is helped (support tab, or Initial Assessment §9.2)">
        <Kpi label="Carer administers" value={sup?.carerAdministers} art="woman-health-worker" loading={L} hint="Level 2b" />
        <Kpi label="Prompt or assist" value={n0(sup?.prompt) + n0(sup?.assist)} art="handshake" loading={L} hint={`${n0(sup?.prompt)} prompt · ${n0(sup?.assist)} assist`} />
        <Kpi label="Self-administers" value={sup?.selfAdministers} art="person-walking" loading={L} hint={`${n0(sup?.othersProvide)} given by family or a nurse`} />
        <Kpi label="No support level recorded" value={sup?.notRecorded} art="page-facing-up" tone={attn(sup?.notRecorded, 'bad')} loading={L} hint={`Of ${n0(m?.serviceUsersOnMedication)} on medication · set it in IA §9.2 or the medication support tab`} />
        <Planned label="Medication reviews due" art="magnifying-glass-tilted-left" needs="A screen to record medication reviews with a next review date (the API can store them, but nothing records them yet)." />
      </Group>

      <Group title="Packs, deliveries & stock" description="Supply from the pharmacy · stock over 30 days">
        <Kpi label="Active packs" value={pk?.active} art="package" loading={L} hint={`${n0(pk?.draft)} in draft`} />
        <Kpi label="Prescription not checked" value={pk?.prescriptionNotChecked} art="memo" tone={attn(pk?.prescriptionNotChecked, 'bad')} loading={L} hint="Active packs not checked against the prescription" />
        <Kpi label="Pack review due (14 days)" value={pk?.reviewDue} art="calendar" tone={attn(pk?.reviewDue, 'warn')} loading={L} />
        <Kpi label="Deliveries to countersign" value={pk?.deliveriesAwaitingCountersign} art="fountain-pen" tone={attn(pk?.deliveriesAwaitingCountersign, 'warn')} loading={L} hint={`${n0(pk?.deliveriesFlagged)} flagged`} />
        <Kpi label="Damaged deliveries" value={pk?.deliveriesDamaged} art="delivery-truck" tone={attn(pk?.deliveriesDamaged, 'bad')} loading={L} />
        <Kpi label="Stock received" value={d?.stock.ADDED} art="inbox-tray" loading={L} to="/medication/stock" hint={`${n0(d?.stock.USED)} used · ${n0(d?.stock.ADJUSTED)} adjusted`} />
        <Kpi label="Stock wasted" value={d?.stock.WASTED} art="wastebasket" tone={attn(d?.stock.WASTED, 'warn')} loading={L} to="/medication/stock" />
      </Group>

      <Group title="Governance" description="Planned KPIs for medicines safety and inspection">
        <Planned label="Medication errors per 1,000 doses" art="chart-increasing" needs="Medication incidents linked to doses, divided by doses given each month." />
        <Planned label="Monthly audit score" art="check-mark-button" needs="A monthly MAR and stock audit per service user, scored." />
        <Planned label="Carers with a current competency check" art="bullseye" needs="Observed medication competency checks with renewal dates." />
        <Planned label="MAR completion" art="spiral-notepad" needs="Due doses generated from schedules, so gaps (no record at all) can be counted." />
        <Planned label="Pharmacy orders outstanding" art="outbox-tray" needs="Repeat orders sent to the pharmacy and marked when received." />
        <Planned label="Covert medication agreements due" art="test-tube" needs="Covert administration agreements with best-interest review dates." />
      </Group>
    </>
  )
}

/* ─── Workforce ──────────────────────────────────────────────────────────── */

function WorkforceInsights() {
  const can = useCan()
  const { locationId } = useGlobalLocationScope()
  const canEmp = can('employees.read')
  const canCompliance = can('employees.compliance.reports.read')
  const canOff = can('employees.read', 'employees.reports.read')
  const canHours = can('hours_approvals.read', 'hours_approvals.manage')
  const canRecruit = can('hr.vacancies.read', 'hr.candidates.read')

  const chart = useEmployeeChartSummary()
  const comp = useComplianceSummary(locationId, canCompliance)
  const off = useStaffOffToday(locationId, canOff)
  const hours = useHoursApprovals('PENDING')
  const recruit = useRecruitmentSummary(canRecruit)

  const staff = chart.data?.staff
  const c = comp.data
  const compliancePct = c && c.totalRequired ? pct(c.valid, c.totalRequired) : null
  const reviews = chart.data?.reviews
  const reviewPct = reviews && reviews.reviewed + reviews.outstanding ? pct(reviews.reviewed, reviews.reviewed + reviews.outstanding) : null

  return (
    <>
      {canEmp ? (
        <Group title="Headcount" description="Your team today">
          <Kpi label="Active staff" value={staff?.active} art="woman-health-worker" loading={chart.isLoading} to="/employee/staff-list" hint={`${n0(staff?.total)} on record · ${n0(staff?.inactive)} inactive`} />
          {canOff ? (
            <>
              <Kpi label="Off today" value={off.data?.total} art="face-with-thermometer" tone={attn(off.data?.total, 'warn')} loading={off.isLoading} to="/employee/absences" hint={`${n0(off.data?.sickness)} sick · ${n0(off.data?.holiday)} holiday`} />
              <Kpi label="Unauthorised absence" value={off.data?.unauthorised} art="no-entry" tone={attn(off.data?.unauthorised, 'bad')} loading={off.isLoading} to="/employee/absences" />
              <Kpi label="Available today" value={staff ? Math.max(0, n0(staff.active) - n0(off.data?.total)) : undefined} art="busts-in-silhouette" tone="good" loading={chart.isLoading || off.isLoading} hint="Active staff not off today" />
            </>
          ) : null}
          <Planned label="Starters this month" art="sparkles" needs="Employment start dates reported by month." />
          <Planned label="Leavers this month" art="door" needs="Leaving records reported by month." />
        </Group>
      ) : null}

      {canCompliance ? (
        <Group title="Compliance" description="DBS, right to work, training and other required documents">
          <Kpi label="Fully compliant" value={compliancePct === null ? null : `${compliancePct}%`} progress={compliancePct} art="shield" tone={compliancePct === null ? 'neutral' : compliancePct >= 95 ? 'good' : compliancePct >= 80 ? 'warn' : 'bad'} loading={comp.isLoading} to="/employee/compliance" hint={`${n0(c?.valid)} of ${n0(c?.totalRequired)} required documents valid`} />
          <Kpi label="Expired" value={c?.expired} art="identification-card" tone={attn(c?.expired, 'bad')} loading={comp.isLoading} to="/employee/compliance" />
          <Kpi label="Expiring soon" value={c?.expiringSoon} art="hourglass-not-done" tone={attn(c?.expiringSoon, 'warn')} loading={comp.isLoading} to="/employee/compliance" />
          <Kpi label="Missing" value={c?.missing} art="file-folder" tone={attn(c?.missing, 'bad')} loading={comp.isLoading} to="/employee/compliance" hint="Never uploaded" />
          <Kpi label="Waiting to be checked" value={c?.pendingReview} art="magnifying-glass-tilted-left" tone={attn(c?.pendingReview, 'warn')} loading={comp.isLoading} to="/employee/compliance" />
          <Kpi label="Rejected" value={c?.rejected} art="cross-mark" tone={attn(c?.rejected, 'warn')} loading={comp.isLoading} to="/employee/compliance" hint="Needs re-uploading" />
        </Group>
      ) : null}

      <Group title="Time & development" description="Hours, reviews and skills">
        {canHours ? <Kpi label="Hours awaiting approval" value={hours.data?.length} art="stopwatch" tone={attn(hours.data?.length, 'warn')} loading={hours.isLoading} to="/hours-approvals" /> : null}
        {canEmp ? (
          <>
            <Kpi label="Staff reviews done" value={reviewPct === null ? null : `${reviewPct}%`} progress={reviewPct} art="handshake" tone={reviewPct === null ? 'neutral' : reviewPct >= 90 ? 'good' : 'warn'} loading={chart.isLoading} hint={`${n0(reviews?.outstanding)} outstanding`} to="/employee/staff-list" />
            <Kpi label="Skills tracked" value={chart.data?.skills?.length} art="bullseye" loading={chart.isLoading} to="/employee/staff-list" />
          </>
        ) : null}
        <Planned label="Supervisions overdue" art="spiral-notepad" needs="Supervision records with a next-due date per carer." />
        <Planned label="Overtime hours this month" art="hourglass-done" needs="Hours worked above contract from approved hours." />
        <Planned label="Contracted hours used" art="bar-chart" needs="Scheduled hours compared with each carer's contract." />
      </Group>

      {canRecruit ? (
        <Group title="Recruitment" description="Hiring pipeline">
          <Kpi label="Open vacancies" value={recruit.data?.openVacancies} art="briefcase" loading={recruit.isLoading} />
          <Kpi label="Active candidates" value={recruit.data?.activeCandidates} art="busts-in-silhouette" loading={recruit.isLoading} />
          <Kpi label="Recent applications" value={recruit.data?.recentApplications?.length} art="inbox-tray" loading={recruit.isLoading} />
          <Planned label="Time to hire" art="stopwatch" needs="Days from application to start date per hire." />
        </Group>
      ) : null}

      <Group title="Retention" description="Planned KPIs for keeping good carers">
        <Planned label="Staff turnover (12 months)" art="counterclockwise-arrows-button" needs="Leavers divided by average headcount over 12 months." />
        <Planned label="Average length of service" art="calendar" needs="Employment start dates for active staff." />
        <Planned label="Sickness absence rate" art="face-with-thermometer" needs="Sickness hours as a share of contracted hours." />
        <Planned label="Agency hours this month" art="office-building" needs="Visits covered by agency staff, recorded separately." />
      </Group>
    </>
  )
}

/* ─── Learning ───────────────────────────────────────────────────────────── */

function LearningInsights() {
  const can = useCan()
  const { locationId } = useGlobalLocationScope()
  const ok = can('learning.dashboard.read')
  const q = useLearningDashboard(locationId ?? undefined)
  const d = ok ? q.data : undefined
  const onTrack = d && d.assignments ? pct(d.assignments - d.overdueAssignments, d.assignments) : null
  return (
    <>
      {ok ? (
        <>
          <Group title="Training delivery" description="Assignments, events and certificates">
            <Kpi label="Assignments on track" value={onTrack === null ? null : `${onTrack}%`} progress={onTrack} art="check-mark-button" tone={onTrack === null ? 'neutral' : onTrack >= 90 ? 'good' : 'warn'} loading={q.isLoading} to="/learning/assignments" hint={`${n0(d?.assignments)} assignments`} />
            <Kpi label="Overdue training" value={d?.overdueAssignments} art="books" tone={attn(d?.overdueAssignments, 'bad')} loading={q.isLoading} to="/learning/assignments" />
            <Kpi label="Upcoming training events" value={d?.upcomingTrainingEvents} art="teacher" loading={q.isLoading} to="/learning/training-events" />
            <Kpi label="Active certificates" value={d?.activeCertificates} art="scroll" tone="good" loading={q.isLoading} to="/learning/certificates" />
            <Kpi label="External training to approve" value={d?.externalTrainingPending} art="school" tone={attn(d?.externalTrainingPending, 'warn')} loading={q.isLoading} to="/learning/external-training" />
          </Group>
          <Group title="Catalogue" description="What staff can learn">
            <Kpi label="Published courses" value={d?.publishedCourses} art="open-book" loading={q.isLoading} to="/learning/courses" hint={`${n0(d?.courses)} courses in total`} />
            <Kpi label="Categories" value={d?.categories} art="card-index-dividers" loading={q.isLoading} to="/learning/courses" />
            <Kpi label="Competencies" value={d?.competencies} art="bullseye" loading={q.isLoading} to="/learning/settings" />
          </Group>
        </>
      ) : null}
      <Group title="Learning quality" description="Planned KPIs for training compliance">
        <Planned label="Mandatory training compliance" art="shield" needs="Each role's mandatory courses compared with completed certificates." />
        <Planned label="Certificates expiring (30 days)" art="hourglass-not-done" needs="Certificate expiry dates reported in one list." />
        <Planned label="Care Certificate completion" art="graduation-cap" needs="Care Certificate standards tracked per new carer." />
        <Planned label="Training hours per carer" art="stopwatch" needs="Course durations summed per carer per quarter." />
      </Group>
    </>
  )
}

/* ─── Quality & compliance ───────────────────────────────────────────────── */

function QualityInsights() {
  const can = useCan()
  const { locationId } = useGlobalLocationScope()
  const canInc = can('incidents.read')
  const canFeedback = can('complaints.read')
  const inc = useIncidentStats(locationId ?? undefined, canInc)
  const fb = useFeedbackSummary()
  const policies = usePolicyReviews(30, can('policies.read'))
  const bodyMapAlerts = useBodyMapGovernanceAlerts(can('service_users.read'))
  const d = inc.data
  const f = canFeedback ? fb.data : undefined
  return (
    <>
      {canInc ? (
        <Group title="Incidents" description="Accidents, incidents and investigations">
          <Kpi label="Open incidents" value={d?.open} art="file-cabinet" loading={inc.isLoading} to="/incidents/view" hint={`${n0(d?.total)} on record`} />
          <Kpi label="Not picked up" value={d?.notPickedUp} art="inbox-tray" tone={attn(d?.notPickedUp, 'bad')} loading={inc.isLoading} to="/incidents/dashboard" hint="No manager assigned yet" />
          <Kpi label="Under review" value={d?.underReview} art="magnifying-glass-tilted-left" loading={inc.isLoading} to="/incidents/dashboard" />
          <Kpi label="Under investigation" value={d?.underInvestigation} art="magnifying-glass-tilted-right" loading={inc.isLoading} to="/incidents/dashboard" />
          <Kpi label="High or critical" value={d?.highOrCritical} art="red-exclamation-mark" tone={attn(d?.highOrCritical, 'bad')} loading={inc.isLoading} to="/incidents/view" />
          <Kpi label="Overdue actions" value={d?.overdueActions} art="writing-hand" tone={attn(d?.overdueActions, 'bad')} loading={inc.isLoading} to="/incidents/dashboard" hint={`${n0(d?.actionsRequired)} actions required`} />
          <Kpi label="Closed this month" value={d?.closedThisMonth} art="check-mark-button" tone="good" loading={inc.isLoading} to="/incidents/view" />
        </Group>
      ) : null}

      {canFeedback ? (
        <Group title="Complaints & compliments" description="What people tell you about your service">
          <Kpi label="Open complaints" value={f?.openComplaints} art="left-speech-bubble" tone={attn(f?.openComplaints, 'warn')} loading={fb.isLoading} to="/incidents/feedback" />
          <Kpi label="Overdue complaints" value={f?.overdueComplaints} art="alarm-clock" tone={attn(f?.overdueComplaints, 'bad')} loading={fb.isLoading} to="/incidents/feedback" hint="Past their response date" />
          <Kpi label="Complaints this month" value={f?.complaintsThisMonth} art="speech-balloon" loading={fb.isLoading} to="/incidents/feedback" />
          <Kpi label="Compliments this month" value={f?.complimentsThisMonth} art="glowing-star" tone="good" loading={fb.isLoading} to="/incidents/feedback" />
          <Kpi label="Compliments to share" value={f?.complimentsToShare} art="megaphone" tone={attn(f?.complimentsToShare, 'warn')} loading={fb.isLoading} to="/incidents/feedback" hint="Not yet passed to the team" />
        </Group>
      ) : null}

      <Group title="Governance" description="Policies, audits and inspection readiness">
        {can('policies.read') ? (
          <Kpi label="Policies due for review" value={policies.data?.count} art="ledger" tone={attn(policies.data?.overdue, 'bad')} loading={policies.isLoading} to="/policies" hint={`${n0(policies.data?.overdue)} overdue`} />
        ) : null}
        {can('service_users.read') ? (
          <Kpi label="Body map safeguarding alerts" value={bodyMapAlerts.data?.total} art="heart-hands" tone={attn(bodyMapAlerts.data?.total, 'bad')} loading={bodyMapAlerts.isLoading} to="/body-map/review-queue" />
        ) : null}
        <Planned label="Audits due" art="magnifying-glass-tilted-right" needs="An audit schedule per location with due dates." />
        <Planned label="Mock CQC rating" art="glowing-star" needs="Mock inspections scored against the five key questions." />
        <Planned label="Open safeguarding cases" art="heart-hands" needs="A dedicated safeguarding case record." />
        <Planned label="High risks on the register" art="stop-sign" needs="An organisational risk register with scores." />
        <Planned label="CQC notifications pending" art="outbox-tray" needs="Statutory notifications tracked from incidents to submission." />
      </Group>

      <Group title="Rates" description="Planned KPIs to compare quality over time">
        <Planned label="Incidents per 1,000 visits" art="chart-increasing" needs="Incident counts divided by completed visits each month." />
        <Planned label="Medication errors per 1,000 doses" art="pill" needs="Medication incidents divided by administered doses." />
        <Planned label="Average days to close an incident" art="hourglass-done" needs="Reported date compared with closed date." />
        <Planned label="Complaints answered on time" art="stopwatch" needs="Response date compared with the target date per complaint." />
      </Group>
    </>
  )
}

/* ─── Finance ────────────────────────────────────────────────────────────── */

const FINANCE_CODE_LABEL: Record<string, string> = {
  MISSING_CHECK_IN: 'Missing check-in',
  MISSING_CHECK_OUT: 'Missing check-out',
  OVERRUN: 'Overrun',
  UNDERRUN: 'Underrun',
  GPS_MISMATCH: 'GPS mismatch',
  RATE_MISSING: 'Rate missing',
  CHARGE_CARD_MISSING: 'Charge card missing',
  PAY_CARD_MISSING: 'Pay card missing',
  TASKS_INCOMPLETE: 'Tasks incomplete',
  FUNDING_SETUP_INCOMPLETE: 'Funding not set up',
  PO_EXPIRED: 'PO expired',
  PO_MISSING: 'PO missing',
}

function FinanceInsights() {
  const can = useCan()
  const { locationId } = useGlobalLocationScope()
  const canRecon = can('billing.visit_reconciliations.read')
  const canInvoices = can('billing.invoice_runs.read')
  const canPayments = can('billing.payments.read')
  const canPayroll = can('payroll.runs.read', 'payroll.settings.read')
  const canPayRuns = can('billing.payroll_runs.read')

  const recon = useVisitReconciliationsSummary(canRecon ? locationId : undefined)
  const funding = useFundingContractsSummary(canRecon ? locationId : undefined)
  const inv = useInvoiceRunsSummary(canInvoices ? locationId : undefined)
  const pay = usePaymentsSummary()
  const payRuns = usePayrollRunsSummary(canPayRuns ? locationId : undefined)
  const payroll = usePayrollOverview()
  const queue = useFinanceExceptionQueue(canRecon)
  const upcoming = useServiceUserUpcoming(locationId, 30, can('service_users.read'))

  const fd = funding.data
  const fundingPct = fd && fd.activeServiceUsers ? pct(fd.serviceUsersWithFunding, fd.activeServiceUsers) : null
  const counts = new Map<string, number>()
  for (const r of queue.data ?? []) counts.set(r.code, (counts.get(r.code) ?? 0) + 1)
  const topCodes = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  // The payments summary sends amounts pre-formatted ("£1,234.00"); plain numbers are formatted here.
  const money = (v: string | undefined) => {
    if (v === undefined || v === null) return undefined
    return Number.isNaN(Number(v)) ? v : formatCurrency(Number(v))
  }
  const amountOf = (v: string | undefined) => Number(String(v ?? '0').replace(/[^0-9.-]/g, '')) || 0

  return (
    <>
      {canRecon || canInvoices ? (
        <Group title="Billing pipeline" description="From delivered visit to invoice">
          {canRecon ? (
            <>
              <Kpi label="Ready to bill" value={recon.data?.visitsReady} art="pound-banknote" tone="good" loading={recon.isLoading} to="/billing/visit-reconciliation" />
              <Kpi label="Waiting for review" value={recon.data?.pendingReview} art="balance-scale" tone={attn(recon.data?.pendingReview, 'warn')} loading={recon.isLoading} to="/billing/visit-reconciliation" />
              <Kpi label="Need manager approval" value={recon.data?.requiresManagerApproval} art="check-mark-button" tone={attn(recon.data?.requiresManagerApproval, 'bad')} loading={recon.isLoading} to="/billing/visit-reconciliation" />
              <Kpi label="With exceptions" value={recon.data?.visitsWithExceptions} art="warning" tone={attn(recon.data?.visitsWithExceptions, 'warn')} loading={recon.isLoading} to="/billing/visit-reconciliation" />
            </>
          ) : null}
          {canInvoices ? <Kpi label="Invoice runs in draft" value={inv.data?.invoiceDrafts} art="receipt" loading={inv.isLoading} to="/billing/invoice-runs" /> : null}
        </Group>
      ) : null}

      {canPayments ? (
        <Group title="Cash & debt" description="Money owed to you">
          <Kpi label="Overdue invoices" value={pay.data?.overdueInvoices} art="credit-card" tone={attn(pay.data?.overdueInvoices, 'bad')} loading={pay.isLoading} to="/billing" />
          <Kpi label="Overdue amount" value={money(pay.data?.overdueAmount)} art="money-with-wings" tone={amountOf(pay.data?.overdueAmount) > 0 ? 'bad' : 'muted'} loading={pay.isLoading} to="/billing" />
          <Kpi label="Unmatched payments" value={pay.data?.unmatchedPayments} art="coin" tone={attn(pay.data?.unmatchedPayments, 'warn')} loading={pay.isLoading} to="/billing" hint="Received, not matched to an invoice" />
          {(pay.data?.agedDebt ?? []).map((b) => (
            <Kpi key={b.bucket} label={`Aged debt · ${b.bucket}`} value={money(b.amount)} art="hourglass-done" tone={amountOf(b.amount) > 0 ? 'warn' : 'muted'} loading={pay.isLoading} to="/billing" hint={`${b.count} invoice${b.count === 1 ? '' : 's'}`} />
          ))}
        </Group>
      ) : null}

      {canRecon ? (
        <Group title="Funding" description="Who pays for each package">
          <Kpi label="Funding coverage" value={fundingPct === null ? null : `${fundingPct}%`} progress={fundingPct} art="bank" tone={fundingPct === null ? 'neutral' : fundingPct >= 95 ? 'good' : 'bad'} loading={funding.isLoading} to="/billing" hint={`${n0(fd?.serviceUsersWithFunding)} of ${n0(fd?.activeServiceUsers)} active service users`} />
          <Kpi label="Not ready to invoice" value={fd?.missingFundingContracts} art="no-entry" tone={attn(fd?.missingFundingContracts, 'bad')} loading={funding.isLoading} to="/billing" hint="Active service users without a ready funding contract" />
          <Kpi label="Contracts ready" value={fd?.ready} art="check-box-with-check" tone="good" loading={funding.isLoading} to="/billing" />
          <Kpi label="Contracts incomplete" value={fd?.incomplete} art="page-facing-up" tone={attn(fd?.incomplete, 'warn')} loading={funding.isLoading} to="/billing" />
          {can('service_users.read') ? (
            <>
              <Kpi label="Funding ending (30 days)" value={upcoming.data?.fundingEnding.count} art="hourglass-not-done" tone={attn(upcoming.data?.fundingEnding.overdue, 'bad')} loading={upcoming.isLoading} hint={`${n0(upcoming.data?.fundingEnding.overdue)} already ended`} />
              <Kpi label="Purchase orders expiring" value={upcoming.data?.purchaseOrders.count} art="receipt" tone={attn(upcoming.data?.purchaseOrders.overdue, 'bad')} loading={upcoming.isLoading} hint="An expired PO blocks invoicing" />
            </>
          ) : null}
        </Group>
      ) : null}

      {canPayroll || canPayRuns ? (
        <Group title="Payroll" description="Paying carers and office staff">
          {canPayRuns ? <Kpi label="Visit pay runs in draft" value={payRuns.data?.payrollDrafts} art="money-with-wings" loading={payRuns.isLoading} to="/billing/salary" /> : null}
          {canPayroll ? (
            <>
              <Kpi label="Open UK payroll runs" value={payroll.data?.openRuns} art="bank" loading={payroll.isLoading} to="/payroll/runs" />
              <Kpi label="Employees ready for payroll" value={payroll.data?.readyEmployeeProfiles} art="identification-card" tone="good" loading={payroll.isLoading} to="/payroll/employees" />
              <Kpi label="Employer PAYE set up" value={payroll.data ? (payroll.data.employerSettingsComplete ? 'Yes' : 'No') : undefined} art="classical-building" tone={payroll.data && !payroll.data.employerSettingsComplete ? 'bad' : 'good'} loading={payroll.isLoading} to="/payroll/employer" />
            </>
          ) : null}
        </Group>
      ) : null}

      {canRecon && topCodes.length ? (
        <Group title="Finance exceptions" description="What is blocking billing and pay, by type">
          {topCodes.map(([code, count]) => (
            <Kpi key={code} label={FINANCE_CODE_LABEL[code] ?? code.replace(/_/g, ' ').toLowerCase()} value={count} art="warning" tone="warn" loading={queue.isLoading} to="/billing/visit-reconciliation" />
          ))}
        </Group>
      ) : null}

      <Group title="Profitability" description="Planned KPIs for the business view">
        <Planned label="Revenue this month" art="chart-increasing" needs="Issued invoice totals by month." />
        <Planned label="Gross margin" art="balance-scale" needs="Charge-card income compared with pay-card cost per visit." />
        <Planned label="Average charge vs pay rate" art="pound-banknote" needs="Hourly charge and pay rates on delivered visits." />
        <Planned label="Unbilled hours" art="hourglass-done" needs="Delivered hours not yet on an invoice run." />
        <Planned label="Debtor days" art="calendar" needs="Average days from invoice to payment." />
        <Planned label="Payroll cost per visit" art="coin" needs="Payroll totals divided by visits paid in the period." />
      </Group>
    </>
  )
}

/* ─── Administration, Messages, Reports ─────────────────────────────────── */

function AdministrationInsights() {
  const can = useCan()
  const ok = can('setup_checklist.read')
  const q = useSetupChecklist()
  const s = ok ? q.data?.summary : undefined
  const setupPct = s && s.total ? pct(s.complete, s.total) : null
  const items = ok ? (q.data?.sections ?? []).flatMap((sec) => sec.items ?? []) : []
  const partial = ok && q.data ? items.filter((i) => i.status === 'partial').length : undefined
  const missing = ok && q.data ? items.filter((i) => i.status === 'missing').length : undefined
  const sectionsLeft = ok && q.data ? (q.data.sections ?? []).filter((sec) => (sec.items ?? []).some((i) => i.status !== 'complete')).length : undefined
  return (
    <>
      {ok ? (
        <Group title="Setup" description="Getting Careflow fully configured">
          <Kpi label="Setup complete" value={setupPct === null ? null : `${setupPct}%`} progress={setupPct} art="check-box-with-check" tone={setupPct === null ? 'neutral' : setupPct >= 100 ? 'good' : 'warn'} loading={q.isLoading} to="/checklist" hint={`${n0(s?.complete)} of ${n0(s?.total)} steps`} />
          <Kpi label="Not started" value={missing} art="page-facing-up" tone={attn(missing, 'bad')} loading={q.isLoading} to="/checklist" />
          <Kpi label="Partly done" value={partial} art="hourglass-not-done" tone={attn(partial, 'warn')} loading={q.isLoading} to="/checklist" />
          <Kpi label="Areas still to finish" value={sectionsLeft} art="card-index-dividers" loading={q.isLoading} to="/checklist" />
        </Group>
      ) : null}
      <Group title="System health" description="Planned KPIs for running the platform">
        <Planned label="Active users (7 days)" art="busts-in-silhouette" needs="Sign-in activity summarised per day." />
        <Planned label="Failed sign-ins today" art="locked" needs="Security events counted per day." />
        <Planned label="Integrations healthy" art="satellite-antenna" needs="Status checks for email, SMS, payroll and other connections." />
        <Planned label="Data quality score" art="bullseye" needs="Checks such as service users without an NHS number or staff without a role." />
      </Group>
    </>
  )
}

function MessagesInsights() {
  return (
    <Group title="Messaging" description="Planned KPIs once staff messaging is built">
      <Planned label="Unread messages" art="speech-balloon" needs="Staff messaging with read receipts." />
      <Planned label="Messages sent this week" art="outbox-tray" needs="Staff messaging." />
      <Planned label="SMS delivered" art="mobile-phone" needs="An SMS provider with delivery reports." />
      <Planned label="Announcements read" art="megaphone" needs="Announcements with read tracking." />
    </Group>
  )
}

function ReportsInsights() {
  return (
    <Group title="Reporting" description="Planned KPIs for report usage">
      <Planned label="Reports run this month" art="bar-chart" needs="Report views and exports logged per report." />
      <Planned label="Scheduled reports" art="calendar" needs="Reports emailed on a schedule." />
      <Planned label="Custom dashboards" art="chart-increasing" needs="Role-based dashboards with chosen KPIs." />
    </Group>
  )
}

/* ─── Registry ───────────────────────────────────────────────────────────── */

const INSIGHTS: Record<string, () => React.ReactElement | null> = {
  'service-users': ServiceUsersInsights,
  'care-operations': CareOperationsInsights,
  medication: MedicationInsights,
  workforce: WorkforceInsights,
  learning: LearningInsights,
  'quality-compliance': QualityInsights,
  finance: FinanceInsights,
  administration: AdministrationInsights,
  messages: MessagesInsights,
  reports: ReportsInsights,
}

export function hasModuleInsights(slug: string): boolean {
  return slug in INSIGHTS
}

/** Full module dashboard for /apps/<module>: live KPIs plus planned ones, grouped by theme. */
export function ModuleInsights({ slug }: { slug: string }) {
  const Insights = INSIGHTS[slug]
  if (!Insights) return null
  return (
    <div className="space-y-7" data-testid="module-insights">
      <Insights />
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ChevronRight className="h-3.5 w-3.5" /> Dashed tiles are KPIs we plan to track; each says what is needed to switch it on.
      </p>
    </div>
  )
}
