import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { cn, formatCurrency } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import type { Permission } from '@/features/auth/types'
import { illustrationSrc } from '@/components/layout/nav-illustrations'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { addDaysToOperationalIso, getSyncedOperationalTimeZone, operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import type { ListServiceUsersParams } from '@/features/service-users/api'
import { useEcmLiveDashboard } from '@/features/ecm/hooks/useEcm'
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
import { usePolicyAcknowledgementSummary } from '@/features/policies/hooks/usePolicies'
import { usePathwaySummary } from '@/features/specialist-pathways/hooks/useSpecialistPathways'
import { PATHWAY_META } from '@/features/specialist-pathways/pathway-specs'
import { useSafeguardingSummary } from '@/features/safeguarding/hooks/useSafeguarding'
import {
  useAdminOverview,
  useAssessmentReviewQueue,
  useBodyMapGovernanceAlerts,
  useBodyMapReviewQueue,
  useComplianceSummary,
  useFinanceExceptionQueue,
  useFinanceOverview,
  useLateMedicationToday,
  useMedicationExceptionsToday,
  useOperationsOverview,
  usePolicyReviews,
  useServiceUserUpcoming,
  useStaffOffToday,
  useSuspensionReviewsOverdue,
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
  const statusId = (code: string) => lookups?.statuses.find((x) => x.code === code)?.id
  const riskId = (code: string) => lookups?.riskLevels.find((r) => r.code === code)?.id
  const monthStart = monthStartIso()
  // Caseload figures cover people receiving care (status Active), so percentages share one denominator.
  const activeId = statusId('ACTIVE')
  const inCare = { statusId: activeId }

  const active = useSuCount(inCare, ready)
  const onHold = useSuCount({ statusId: statusId('ON_HOLD'), showInactive: true }, ready)
  const discharged = useSuCount({ statusId: statusId('DISCHARGED'), showInactive: true }, ready)
  const preAdmission = useSuCount({ statusId: statusId('PRE_ADMISSION'), showInactive: true }, ready)
  const pending = useSuCount({ statusId: statusId('PENDING'), showInactive: true }, ready)
  const newStarts = useSuCount({ serviceStartDateFrom: monthStart })
  const hospital = useSuCount({ hospitalisedOnly: true })
  const noKw = useSuCount({ ...inCare, unassignedKeyWorker: true }, ready)
  const flash = useSuCount({ ...inCare, hasActiveFlashMessage: true }, ready)

  const low = useSuCount({ ...inCare, riskLevelId: riskId('LOW') }, ready)
  const medium = useSuCount({ ...inCare, riskLevelId: riskId('MEDIUM') }, ready)
  const high = useSuCount({ ...inCare, riskLevelId: riskId('HIGH') }, ready)
  const critical = useSuCount({ ...inCare, riskLevelId: riskId('CRITICAL') }, ready)
  const loneWorker = useSuCount({ ...inCare, loneWorkerRisk: true }, ready)
  const safeguarding = useSuCount({ ...inCare, safeguardingHistory: true }, ready)

  // Initial assessments cover everyone on the books, including pre-admission.
  const iaNone = useSuCount({ initialAssessmentStatus: 'none' })
  const iaProgress = useSuCount({ initialAssessmentStatus: 'in_progress' })
  const iaReview = useSuCount({ initialAssessmentStatus: 'awaiting_review' })
  const iaDone = useSuCount({ initialAssessmentStatus: 'completed' })
  const cpNone = useSuCount({ ...inCare, carePlanListStatus: 'none' }, ready)
  const cpOverdue = useSuCount({ ...inCare, carePlanListStatus: 'overdue' }, ready)
  const cpWeek = useSuCount({ ...inCare, carePlanListStatus: 'due_within_week' }, ready)
  // No upper bound: only past visits can be confirmed missed, and a bare 'to' date would cut off today.
  const missedMonth = useSuCount({ missedVisitsMin: 1, missedVisitsFrom: monthStart })

  const { locationId } = useGlobalLocationScope()
  const assessments = useAssessmentReviewQueue(locationId, can('service_users.assessments.read'))
  const bodyMap = useBodyMapReviewQueue(locationId, true)
  const bodyMapAlerts = useBodyMapGovernanceAlerts(true)
  const meds = useMedicationExceptionsToday(locationId, true)
  const upcoming = useServiceUserUpcoming(locationId, 30, true)
  const suspensions = useSuspensionReviewsOverdue(true)
  const u = upcoming.data

  const activeN = n0(active.value)
  const coverage = activeN && cpNone.value !== undefined ? pct(activeN - n0(cpNone.value), activeN) : null
  const iaTotal = n0(iaNone.value) + n0(iaProgress.value) + n0(iaReview.value) + n0(iaDone.value)
  const iaCoverage = iaTotal ? pct(n0(iaDone.value), iaTotal) : null
  const riskLoaded = [low, medium, high, critical].every((x) => x.value !== undefined)
  const unscored = riskLoaded ? Math.max(0, activeN - n0(low.value) - n0(medium.value) - n0(high.value) - n0(critical.value)) : undefined

  return (
    <>
      <Group title="Caseload" description="Who you support and where they are">
        <Kpi label="Active service users" value={active.value} art="older-person" loading={active.loading} to="/service-users/all" hint="Receiving care now" />
        <Kpi label="New starts this month" value={newStarts.value} art="sparkles" tone="good" loading={newStarts.loading} to="/service-users/all" hint="Service started since the 1st" />
        <Kpi label="On hold" value={onHold.value} art="pause-button" tone={attn(onHold.value, 'warn')} loading={onHold.loading} to="/service-users/all" hint="Care paused" />
        <Kpi label="In hospital" value={hospital.value} art="hospital" tone={attn(hospital.value, 'warn')} loading={hospital.loading} to="/service-users/all" hint="Currently hospitalised" />
        <Kpi label="Discharged" value={discharged.value} art="door" tone="neutral" loading={discharged.loading} to="/service-users/all" hint="Service ended" />
        <Kpi label="Pre-admission" value={preAdmission.value} art="inbox-tray" loading={preAdmission.loading} to="/service-users/all" hint={`${n0(pending.value)} pending · not receiving care yet`} />
        <Kpi label="No key worker" value={noKw.value} art="identification-card" tone={attn(noKw.value, 'warn')} loading={noKw.loading} to="/service-users/all" hint={`Of ${activeN} receiving care`} />
        <Kpi label="Active flash messages" value={flash.value} art="megaphone" tone={attn(flash.value, 'warn')} loading={flash.loading} to="/service-users/all" hint="Shown to carers on visits" />
        <Planned label="Contracted vs delivered hours" art="hourglass-not-done" needs="Weekly commissioned hours per service user compared with delivered visit time." />
      </Group>

      <Group title="Risk profile" description="Matches the coloured ring on each service user's photo">
        <Kpi label="Low risk" value={low.value} art="green-heart" tone="good" loading={low.loading} to="/service-users/all" />
        <Kpi label="Medium risk" value={medium.value} art="yellow-heart" tone={attn(medium.value, 'warn')} loading={medium.loading} to="/service-users/all" />
        <Kpi label="High risk" value={high.value} art="orange-heart" tone={attn(high.value, 'bad')} loading={high.loading} to="/service-users/all" />
        <Kpi label="Critical risk" value={critical.value} art="heart-exclamation" tone={attn(critical.value, 'bad')} loading={critical.loading} to="/service-users/all" />
        <Kpi label="No risk level" value={unscored} art="white-question-mark" tone={attn(unscored, 'bad')} loading={!riskLoaded} to="/service-users/all" hint="Receiving care without a risk rating" />
        <Kpi label="Lone worker risk" value={loneWorker.value} art="person-walking" tone={attn(loneWorker.value, 'warn')} loading={loneWorker.loading} to="/service-users/all" hint="Flagged in the initial assessment" />
        <Kpi label="Safeguarding history" value={safeguarding.value} art="heart-hands" tone={attn(safeguarding.value, 'warn')} loading={safeguarding.loading} to="/service-users/all" />
      </Group>

      <Group title="Assessment & care planning" description="Coverage and what is due">
        <Kpi label="Care plan coverage" value={coverage === null ? null : `${coverage}%`} progress={coverage} art="memo" tone={coverage === null ? 'neutral' : coverage >= 95 ? 'good' : coverage >= 80 ? 'warn' : 'bad'} loading={cpNone.loading || active.loading} hint={`${n0(cpNone.value)} receiving care without a care plan`} to="/care-plans/reviews" />
        <Kpi label="Initial assessments complete" value={iaCoverage === null ? null : `${iaCoverage}%`} progress={iaCoverage} art="clipboard" tone={iaCoverage === null ? 'neutral' : iaCoverage >= 95 ? 'good' : 'warn'} loading={iaDone.loading || active.loading} hint={`${n0(iaDone.value)} of ${iaTotal} reviewed and completed`} to="/service-users/initial-assessment" />
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
        <Kpi label="Confirmed missed visit this month" value={missedMonth.value} art="cross-mark" tone={attn(missedMonth.value, 'bad')} loading={missedMonth.loading} to="/service-users/all" hint="Service users with a missed visit confirmed by a manager; unconfirmed ones are in Care Operations" />
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

const CANCEL_REASON_LABEL: Record<string, string> = {
  CLIENT_HOSPITAL_ADMISSION: 'Hospital admission',
  CLIENT_REQUEST: 'Service user request',
  CLIENT_UNAVAILABLE: 'Service user unavailable',
  VISIT_PLAN_SUSPENDED: 'Visit plan paused',
  SERVICE_NOT_REQUIRED: 'Not required',
  PROVIDER_UNABLE_TO_STAFF: 'Could not staff',
  PROVIDER_ROTA_ERROR: 'Rota error',
  WEATHER_OR_EMERGENCY: 'Weather or emergency',
  DUPLICATE_ENTRY: 'Duplicate',
  OTHER: 'Other',
}

/** Short date and time in the organisation's timezone. */
function orgDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: getSyncedOperationalTimeZone(),
  })
}

function CareOperationsInsights() {
  const can = useCan()
  const canEcm = can('ecm.read', 'ecm.monitor')
  const canSchedule = can(...SCHEDULE_READ)
  const canMeds = can('service_users.read')
  const canRecon = can('billing.visit_reconciliations.read')
  const today = operationalTodayIso()
  const weekAgo = addDaysToOperationalIso(today, -7)
  const yesterday = addDaysToOperationalIso(today, -1)
  const { locationId } = useGlobalLocationScope()
  const loc = locationId ?? undefined

  const ops = useOperationsOverview(locationId, canEcm || canSchedule)
  const live = useEcmLiveDashboard({ dateFrom: today, dateTo: today, locationId: loc, enabled: canEcm })
  // Last 7 complete days, so today's visits that have not happened yet do not drag the rates down.
  const week = useEcmLiveDashboard({ dateFrom: weekAgo, dateTo: yesterday, locationId: loc, enabled: canEcm })
  const todayJobs = useScheduleList(today, canSchedule)
  const housekeeping = useHousekeepingJobsNeedingAttention(1)
  const meds = useMedicationExceptionsToday(locationId, canMeds)
  const late = useLateMedicationToday(canMeds)
  const recon = useVisitReconciliationsSummary(canRecon ? locationId : undefined)

  const o = ops.data
  const OL = ops.isLoading
  const s = live.data?.summary
  const w = week.data?.summary
  const jobs = todayJobs.data?.jobs ?? []
  const dayTotal = (todayJobs.data?.meta as { total?: number } | undefined)?.total ?? jobs.length
  const partialDay = dayTotal > jobs.length ? ` · based on the first ${jobs.length} of ${dayTotal} visits` : ''
  const kind = (...k: string[]) => k.reduce((n, key) => n + n0(o?.alerts.byKind[key]), 0)
  const onTime = s?.completedOnTimePct ?? null
  const completionPct = s && s.total ? pct(s.completed, s.total) : null
  const weekCompletion = w && w.total ? pct(w.completed, w.total) : null
  const weekMissed = n0(w?.confirmedMissed) + n0(w?.potentialMissed)
  const b = meds.data?.byStatus
  const c = o?.cancellations
  const topReasons = Object.entries(c?.byReason ?? {})
    .sort((x, y) => y[1] - x[1])
    .slice(0, 2)
    .map(([r, n]) => `${n} ${CANCEL_REASON_LABEL[r]?.toLowerCase() ?? r.toLowerCase()}`)
    .join(' · ')
  const avgCarers = o?.continuity.averageCarers ?? null
  const rateTone = (v: number | null, good: number, warn: number): Tone => (v === null ? 'neutral' : v >= good ? 'good' : v >= warn ? 'warn' : 'bad')

  return (
    <>
      {canEcm ? (
        <Group title="Today, live" description="Electronic call monitoring · refreshes every minute">
          <Kpi label="Visits today" value={s?.total} art="spiral-calendar" loading={live.isLoading} to="/ecm/live" hint={`${n0(s?.inProgress)} in progress now · ${n0(s?.outstanding)} still to happen or close`} />
          <Kpi label="Completed" value={completionPct === null ? s?.completed : `${completionPct}%`} progress={completionPct} art="check-mark-button" tone="good" loading={live.isLoading} to="/ecm/live" hint={`${n0(s?.completed)} of ${n0(s?.total)} visits`} />
          <Kpi label="Completed on time" value={onTime === null ? null : `${onTime}%`} progress={onTime} art="stopwatch" tone={rateTone(onTime, 90, 75)} loading={live.isLoading} to="/ecm/live" hint={s?.completed ? `${n0(s?.completedLate)} completed late` : 'No visits completed yet today'} />
          <Kpi label="Missed or at risk" value={n0(s?.confirmedMissed) + n0(s?.potentialMissed)} art="cross-mark" tone={attn(n0(s?.confirmedMissed) + n0(s?.potentialMissed), 'bad')} loading={live.isLoading} to="/ecm/live" hint={`${n0(s?.confirmedMissed)} confirmed missed · ${n0(s?.potentialMissed)} past start with no check-in`} />
          <Kpi label="Not checked out" value={s?.missingCheckout} art="door" tone={attn(s?.missingCheckout, 'warn')} loading={live.isLoading} to="/ecm/live" hint="Checked in but no check-out after the planned end" />
        </Group>
      ) : null}

      {canEcm ? (
        <Group title="Alerts needing action" description="Open ECM alerts across all dates · counted in full">
          <Kpi label="Open alerts" value={o?.alerts.open} art="bell" tone={attn(o?.alerts.open, 'warn')} loading={OL} to="/ecm/live" hint={o?.alerts.oldestOpenAt ? `Oldest raised ${orgDateTime(o.alerts.oldestOpenAt)}` : 'Nothing open'} />
          <Kpi label="Not acknowledged" value={o?.alerts.unacknowledged} art="raising-hands" tone={attn(o?.alerts.unacknowledged, 'bad')} loading={OL} to="/ecm/live" hint="No one has picked these up" />
          <Kpi label="Past response target" value={o?.alerts.pastResponseTarget} art="alarm-clock" tone={attn(o?.alerts.pastResponseTarget, 'bad')} loading={OL} to="/ecm/live" hint="Unacknowledged after the escalation deadline" />
          <Kpi label="Potential missed visits" value={kind('POTENTIAL_MISSED', 'CONFIRMED_MISSED')} art="cross-mark" tone={attn(kind('POTENTIAL_MISSED', 'CONFIRMED_MISSED'), 'bad')} loading={OL} to="/ecm/live" hint="Open missed-visit alerts, including earlier days" />
          <Kpi label="SOS" value={kind('CARER_SOS')} art="sos-button" tone={attn(kind('CARER_SOS'), 'bad')} loading={OL} to="/ecm/live" />
          <Kpi label="Late arrivals" value={kind('LATE_ARRIVAL', 'VERY_LATE_ARRIVAL')} art="hourglass-not-done" tone={attn(kind('LATE_ARRIVAL', 'VERY_LATE_ARRIVAL'), 'warn')} loading={OL} to="/ecm/live" hint={`${kind('VERY_LATE_ARRIVAL')} very late`} />
          <Kpi label="Left or outside the visit area" value={kind('LEFT_VISIT_AREA', 'OUTSIDE_GEOFENCE')} art="round-pushpin" tone={attn(kind('LEFT_VISIT_AREA', 'OUTSIDE_GEOFENCE'), 'warn')} loading={OL} to="/ecm/live" />
          <Kpi label="Check-in requests" value={kind('OUTSIDE_AREA_CHECK_IN_REQUEST', 'MANUAL_ATTENDANCE')} art="mobile-phone" tone={attn(kind('OUTSIDE_AREA_CHECK_IN_REQUEST', 'MANUAL_ATTENDANCE'), 'warn')} loading={OL} to="/ecm/live" hint={`${kind('UNABLE_TO_START')} unable to start`} />
          <Kpi label="Suspicious location" value={kind('MOCK_LOCATION')} art="magnifying-glass-tilted-right" tone={attn(kind('MOCK_LOCATION'), 'bad')} loading={OL} to="/ecm/live" hint="Faked GPS detected" />
          <Kpi label="Duration problems" value={kind('SHORT_VISIT', 'EARLY_DEPARTURE', 'LONG_VISIT', 'EXCESSIVE_OVERRUN', 'MISSING_CHECKOUT')} art="stopwatch" tone={attn(kind('SHORT_VISIT', 'EARLY_DEPARTURE', 'LONG_VISIT', 'EXCESSIVE_OVERRUN', 'MISSING_CHECKOUT'), 'warn')} loading={OL} to="/ecm/live" hint={`${kind('SHORT_VISIT', 'EARLY_DEPARTURE')} short · ${kind('LONG_VISIT', 'EXCESSIVE_OVERRUN')} overran · ${kind('MISSING_CHECKOUT')} no check-out`} />
        </Group>
      ) : null}

      {canSchedule ? (
        <Group title="Cover & allocation" description="Visits without enough carers · counted in the database">
          <Kpi label="Need carers today" value={o?.cover.unfilledToday} art="woman-health-worker" tone={attn(o?.cover.unfilledToday, 'bad')} loading={OL} to="/scheduling/schedule-jobs" hint={`${n0(o?.cover.visitsToday)} visits today`} />
          <Kpi label="Need carers, next 7 days" value={o?.cover.unfilledNext7} art="calendar" tone={attn(o?.cover.unfilledNext7, 'bad')} loading={OL} to="/scheduling/schedule-jobs" hint={`${n0(o?.cover.visitsNext7)} visits · ${n0(o?.cover.plannedHoursNext7).toLocaleString('en-GB')} planned hours`} />
          <Kpi label="Need carers, next 28 days" value={o?.cover.unfilledNext28} art="tear-off-calendar" tone={attn(o?.cover.unfilledNext28, 'warn')} loading={OL} to="/scheduling/jobs" hint={o?.cover.nextUnfilledAt ? `First one ${orgDateTime(o.cover.nextUnfilledAt)}` : 'All visits covered'} />
          <Kpi label="Jobs needing attention" value={housekeeping.data?.meta?.total} art="warning" tone={attn(housekeeping.data?.meta?.total, 'warn')} loading={housekeeping.isLoading} to="/scheduling/jobs" hint="Any date: no carers, clashes or not closed" />
          <Kpi label="Time-critical visits today" value={jobs.filter((j) => j.timeSensitive?.hasAny).length} art="alarm-clock" loading={todayJobs.isLoading} to="/scheduling/schedule-jobs" hint={`Time-sensitive medicine or task${partialDay}`} />
          <Kpi label="Service user away today" value={jobs.filter((j) => j.serviceUserAbsent).length} art="pause-button" loading={todayJobs.isLoading} to="/scheduling/schedule-jobs" hint={`Visits affected by an absence${partialDay}`} />
          <Planned label="Rota utilisation" art="bar-chart" needs="Scheduled hours compared with carers' contracted hours this week." />
        </Group>
      ) : null}

      {canEcm || canSchedule ? (
        <Group title="Last 7 days" description="Delivery and cancellations over the last 7 complete days">
          {canEcm ? (
            <>
              <Kpi label="Visits completed" value={weekCompletion === null ? null : `${weekCompletion}%`} progress={weekCompletion} art="check-mark-button" tone={rateTone(weekCompletion, 95, 85)} loading={week.isLoading} to="/ecm/graph" hint={`${n0(w?.completed).toLocaleString('en-GB')} of ${n0(w?.total).toLocaleString('en-GB')} visits checked out`} />
              <Kpi label="Completed on time" value={w?.completedOnTimePct === null || w?.completedOnTimePct === undefined ? null : `${w.completedOnTimePct}%`} progress={w?.completedOnTimePct} art="stopwatch" tone={rateTone(w?.completedOnTimePct ?? null, 90, 75)} loading={week.isLoading} to="/ecm/graph" hint={`${n0(w?.completedLate)} completed late`} />
              <Kpi label="Missed or never checked in" value={weekMissed} art="cross-mark" tone={attn(weekMissed, 'bad')} loading={week.isLoading} to="/ecm/graph" hint={`${n0(w?.confirmedMissed)} confirmed · ${n0(w?.potentialMissed)} no check-in recorded`} />
            </>
          ) : null}
          <Kpi label="Visits cancelled" value={c?.last7} art="wastebasket" loading={OL} to="/scheduling/jobs" hint={topReasons || 'No cancellations'} />
          <Kpi label="Cancelled by us" value={c?.providerCaused} art="no-entry" tone={attn(c?.providerCaused, 'bad')} loading={OL} to="/scheduling/jobs" hint="Could not staff or rota error: care not delivered" />
          <Kpi label="Cancelled without a welfare check" value={c?.withoutWelfareCheck} art="heart-hands" tone={attn(c?.withoutWelfareCheck, 'bad')} loading={OL} to="/scheduling/jobs" hint={`${n0(c?.timeCriticalNotEscalated)} time-critical visits not escalated`} />
        </Group>
      ) : null}

      {canSchedule ? (
        <Group title="Continuity of care" description="Last 28 days · from carers allocated to visits">
          <Kpi label="Different carers per service user" value={avgCarers === null ? null : avgCarers.toLocaleString('en-GB')} art="busts-in-silhouette" tone={avgCarers === null ? 'neutral' : avgCarers <= 3 ? 'good' : avgCarers <= 5 ? 'warn' : 'bad'} loading={OL} hint={`Average across ${n0(o?.continuity.serviceUsers)} service users · fewer is better`} />
          <Kpi label={`Seeing more than ${o?.continuity.manyCarersThreshold ?? 5} carers`} value={o?.continuity.serviceUsersWithManyCarers} art="handshake" tone={attn(o?.continuity.serviceUsersWithManyCarers, 'warn')} loading={OL} to="/service-users/all" hint="Service users with poor continuity" />
          <Planned label="Visits by regular carers" art="green-heart" needs="Each service user's preferred carers recorded, compared with who actually visited." />
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
        <Planned label="Average travel between visits" art="motorway" needs="Travel time from route planning, or the gap between check-out and the next check-in." />
        <Planned label="Mileage per visit" art="round-pushpin" needs="Mileage claims linked to visits." />
        <Planned label="Overrun minutes this week" art="hourglass-done" needs="Actual minus planned time on approved overruns from visit reconciliation." />
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
  const L = q.isLoading
  const owed = d?.owedAssignments ?? d?.assignments
  const onTrack = d && owed ? pct(owed - d.overdueAssignments, owed) : null
  const completion = d && owed ? pct(n0(d.completedAssignments), owed) : null
  const mandatory = d && d.mandatoryOwed ? pct(n0(d.mandatoryCompleted), d.mandatoryOwed) : null
  const rate = (v: number | null, good: number, warn: number): Tone => (v === null ? 'neutral' : v >= good ? 'good' : v >= warn ? 'warn' : 'bad')
  return (
    <>
      {ok ? (
        <>
          <Group title="Training compliance" description="Assigned training that staff owe (cancelled and exempt excluded)">
            <Kpi label="Mandatory training complete" value={mandatory === null ? null : `${mandatory}%`} progress={mandatory} art="shield" tone={rate(mandatory, 95, 80)} loading={L} to="/learning/assignments" hint={`${n0(d?.mandatoryCompleted)} of ${n0(d?.mandatoryOwed)} mandatory assignments`} />
            <Kpi label="All training complete" value={completion === null ? null : `${completion}%`} progress={completion} art="check-mark-button" tone={rate(completion, 90, 70)} loading={L} to="/learning/assignments" hint={`${n0(d?.completedAssignments)} of ${n0(owed)} assignments`} />
            <Kpi label="Not overdue" value={onTrack === null ? null : `${onTrack}%`} progress={onTrack} art="stopwatch" tone={rate(onTrack, 95, 85)} loading={L} to="/learning/assignments" hint="Assignments still within their due date" />
            <Kpi label="Overdue training" value={d?.overdueAssignments} art="books" tone={attn(d?.overdueAssignments, 'bad')} loading={L} to="/learning/assignments" />
            <Kpi label="Due in 30 days" value={d?.dueNext30} art="calendar" tone={attn(d?.dueNext30, 'warn')} loading={L} to="/learning/assignments" />
            <Kpi label="Waiting for sign-off" value={d?.awaitingSignOff} art="writing-hand" tone={attn(d?.awaitingSignOff, 'warn')} loading={L} to="/learning/assignments" hint="Assessment or approval outstanding" />
            <Kpi label="Failed or expired" value={n0(d?.failedAssignments) + n0(d?.expiredAssignments)} art="cross-mark" tone={attn(n0(d?.failedAssignments) + n0(d?.expiredAssignments), 'bad')} loading={L} to="/learning/assignments" hint={`${n0(d?.failedAssignments)} failed · ${n0(d?.expiredAssignments)} expired`} />
          </Group>
          <Group title="Certificates & events" description="Proof of training and what is coming up">
            <Kpi label="Active certificates" value={d?.activeCertificates} art="scroll" tone="good" loading={L} to="/learning/certificates" />
            <Kpi label="Certificates expiring (30 days)" value={d?.certificatesExpiring30} art="hourglass-not-done" tone={attn(d?.certificatesExpiring30, 'warn')} loading={L} to="/learning/certificates" />
            <Kpi label="Certificates expired" value={d?.certificatesExpired} art="hourglass-done" tone={attn(d?.certificatesExpired, 'bad')} loading={L} to="/learning/certificates" />
            <Kpi label="Upcoming training events" value={d?.upcomingTrainingEvents} art="teacher" loading={L} to="/learning/training-events" />
            <Kpi label="External training to approve" value={d?.externalTrainingPending} art="school" tone={attn(d?.externalTrainingPending, 'warn')} loading={L} to="/learning/external-training" />
          </Group>
          <Group title="Catalogue" description="What staff can learn">
            <Kpi label="Published courses" value={d?.publishedCourses} art="open-book" loading={L} to="/learning/courses" hint={`${n0(d?.courses)} courses in total`} />
            <Kpi label="Categories" value={d?.categories} art="card-index-dividers" loading={L} to="/learning/courses" />
            <Kpi label="Competencies" value={d?.competencies} art="bullseye" loading={L} to="/learning/settings" />
            <Kpi label="Policy courses to move" value={d?.policyTypeCourses} art="ledger" tone={attn(d?.policyTypeCourses, 'warn')} loading={L} to="/learning/courses" hint="Read-and-sign belongs in the Policy Library; keep only training here" />
          </Group>
        </>
      ) : null}
      <Group title="Learning quality" description="Planned KPIs">
        <Planned label="Care Certificate completion" art="graduation-cap" needs="Care Certificate standards tracked per new carer." />
        <Planned label="Training hours per carer" art="stopwatch" needs="Course durations summed per carer per quarter." />
        <Planned label="Staff with no training assigned" art="busts-in-silhouette" needs="Active staff compared with those who have any assignment." />
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
  const signed = usePolicyAcknowledgementSummary(can('policies.read'))
  const sd = signed.data
  const bodyMapAlerts = useBodyMapGovernanceAlerts(can('service_users.read'))
  const canSg = can('safeguarding.read', 'safeguarding.manage')
  const sg = useSafeguardingSummary(locationId ?? undefined, canSg)
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
          <>
            <Kpi label="Published policies" value={policies.data ? n0(policies.data.byStatus?.PUBLISHED) : undefined} art="ledger" loading={policies.isLoading} to="/policies" hint={`${n0(policies.data?.byStatus?.DRAFT)} in draft`} />
            <Kpi label="Policies awaiting approval" value={n0(policies.data?.byStatus?.IN_REVIEW) + n0(policies.data?.byStatus?.APPROVED)} art="fountain-pen" tone={attn(n0(policies.data?.byStatus?.IN_REVIEW) + n0(policies.data?.byStatus?.APPROVED), 'warn')} loading={policies.isLoading} to="/policies" hint={`${n0(policies.data?.byStatus?.IN_REVIEW)} in review · ${n0(policies.data?.byStatus?.APPROVED)} approved, not published`} />
            <Kpi label="Policies due for review (30 days)" value={policies.data?.count} art="calendar" tone={attn(policies.data?.overdue, 'bad')} loading={policies.isLoading} to="/policies" hint={`${n0(policies.data?.overdue)} overdue`} />
            <Kpi label="Policies read and signed" value={sd?.pct === null || sd?.pct === undefined ? (sd ? null : undefined) : `${sd.pct}%`} progress={sd?.pct} art="fountain-pen" tone={sd?.pct === null || sd?.pct === undefined ? 'neutral' : sd.pct >= 95 ? 'good' : sd.pct >= 80 ? 'warn' : 'bad'} loading={signed.isLoading} to="/policies/acknowledgements" hint={sd ? `${sd.acknowledged} of ${sd.required} signatures across ${sd.policiesRequiringAcknowledgement} policies` : undefined} />
            <Kpi label="Staff with policies to sign" value={sd?.staffWithOutstanding} art="busts-in-silhouette" tone={attn(sd?.staffWithOutstanding, 'warn')} loading={signed.isLoading} to="/policies/acknowledgements" hint={sd ? `Of ${sd.staffInScope} staff with a sign-in` : undefined} />
            <Kpi label="Published without a review date" value={policies.data?.publishedNoReviewDate} art="warning" tone={attn(policies.data?.publishedNoReviewDate, 'warn')} loading={policies.isLoading} to="/policies" hint="Will never come up for review" />
          </>
        ) : null}
        {can('service_users.read') ? (
          <Kpi label="Body map safeguarding alerts" value={bodyMapAlerts.data?.total} art="heart-hands" tone={attn(bodyMapAlerts.data?.total, 'bad')} loading={bodyMapAlerts.isLoading} to="/body-map/review-queue" />
        ) : null}
        <Planned label="Audits due" art="magnifying-glass-tilted-right" needs="An audit schedule per location with due dates." />
        <Planned label="Mock CQC rating" art="glowing-star" needs="Mock inspections scored against the five key questions." />
        {canSg ? (
          <Kpi label="Open safeguarding cases" value={sg.data?.open} art="heart-hands" tone={attn(sg.data?.laPending, 'bad')} loading={sg.isLoading} to="/safeguarding" hint={sg.data ? `${sg.data.laPending} LA referral and ${sg.data.cqcPending} CQC decisions pending` : undefined} />
        ) : null}
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

  const income = useFinanceOverview(canInvoices || canPayments)
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

  const inc = income.data
  const thisM = inc?.invoicedThisMonth.amount
  const lastM = inc?.invoicedLastMonth.amount
  const change = thisM !== undefined && lastM ? Math.round(((thisM - lastM) / lastM) * 100) : null

  return (
    <>
      {canInvoices || canPayments ? (
        <Group title="Income" description={`This month (${inc?.month ?? '…'}) · invoices counted by the period they cover`}>
          <Kpi label="Invoiced this month" value={thisM === undefined ? undefined : formatCurrency(thisM)} art="chart-increasing" tone="good" loading={income.isLoading} to="/billing/invoice-runs" hint={`${n0(inc?.invoicedThisMonth.runs)} invoice runs${change === null ? '' : ` · ${change >= 0 ? '+' : ''}${change}% on last month`}`} />
          <Kpi label="Invoiced last month" value={lastM === undefined ? undefined : formatCurrency(lastM)} art="calendar" loading={income.isLoading} to="/billing/invoice-runs" hint={`${n0(inc?.invoicedLastMonth.runs)} invoice runs`} />
          <Kpi label="Cash received this month" value={inc ? formatCurrency(inc.receivedThisMonth.amount) : undefined} art="money-with-wings" loading={income.isLoading} to="/billing" hint={`${n0(inc?.receivedThisMonth.payments)} payments`} />
          <Kpi label="Disputed invoices" value={inc?.disputed.runs} art="balance-scale" tone={attn(inc?.disputed.runs, 'bad')} loading={income.isLoading} to="/billing/invoice-runs" hint={inc ? `${formatCurrency(inc.disputed.amount)} in dispute` : undefined} />
          <Kpi label="Invoice runs to review" value={inc?.invoiceRunsAwaitingReview} art="magnifying-glass-tilted-left" tone={attn(inc?.invoiceRunsAwaitingReview, 'warn')} loading={income.isLoading} to="/billing/invoice-runs" hint="Ready for review or with exceptions" />
        </Group>
      ) : null}

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
          <Kpi label="Funding coverage" value={fundingPct === null ? null : `${fundingPct}%`} progress={fundingPct} art="bank" tone={fundingPct === null ? 'neutral' : fundingPct >= 95 ? 'good' : 'bad'} loading={funding.isLoading} to="/billing" hint={`${n0(fd?.serviceUsersWithFunding)} of ${n0(fd?.activeServiceUsers)} service users on the books have a funding contract`} />
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
  const canSecurity = can('audit_logs.read', 'users.read')
  const admin = useAdminOverview(canSecurity)
  const a = admin.data
  const securityEntries = Object.entries(a?.securityEvents7d ?? {}).sort((x, y) => y[1] - x[1])
  const securityTotal = a ? securityEntries.reduce((n, [, v]) => n + v, 0) : undefined
  const securityTop = securityEntries
    .slice(0, 2)
    .map(([k, v]) => `${v} ${k.replace(/_/g, ' ').toLowerCase()}`)
    .join(' · ')
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
      {canSecurity ? (
        <Group title="Users & security" description="From the sign-in history and security log">
          <Kpi label="Active users (7 days)" value={a?.activeUsers7d} art="busts-in-silhouette" loading={admin.isLoading} to="/settings/users-access" hint={`Of ${n0(a?.users)} active accounts`} />
          <Kpi label={`Dormant accounts (${a?.dormantDays ?? 90} days)`} value={a?.dormantUsers} art="zzz" tone={attn(a?.dormantUsers, 'warn')} loading={admin.isLoading} to="/settings/users-access" hint="No sign-in in that time: review or disable access" />
          <Kpi label="Failed sign-ins (24 hours)" value={a?.failedSignIns24h} art="locked" tone={attn(a?.failedSignIns24h, 'warn')} loading={admin.isLoading} to="/admin/audit" hint={`${n0(a?.failedSignIns7d)} in the last 7 days`} />
          <Kpi label="Security events (7 days)" value={securityTotal} art="shield" tone={attn(securityTotal, 'warn')} loading={admin.isLoading} to="/admin/audit" hint={securityTop || 'None recorded'} />
        </Group>
      ) : null}
      <Group title="System health" description="Planned KPIs for running the platform">
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

/* ─── Safeguarding ───────────────────────────────────────────────────────── */

function SafeguardingInsights() {
  const can = useCan()
  const { locationId } = useGlobalLocationScope()
  const ok = can('safeguarding.read', 'safeguarding.manage')
  const q = useSafeguardingSummary(locationId ?? undefined, ok)
  const d = ok ? q.data : undefined
  const L = q.isLoading
  if (!ok) return null
  const pctTone: Tone = d?.auditPct == null ? 'neutral' : d.auditPct >= 90 ? 'good' : d.auditPct >= 70 ? 'warn' : 'bad'
  return (
    <>
      <Group title="Open concerns" description="Safeguarding cases still being managed">
        <Kpi label="Open cases" value={d?.open} art="heart-hands" loading={L} to="/safeguarding" hint={`${n0(d?.total)} recorded in total`} />
        <Kpi label="High risk" value={d?.highRisk} art="red-exclamation-mark" tone={attn(d?.highRisk, 'bad')} loading={L} to="/safeguarding" />
        <Kpi label="New this month" value={d?.newThisMonth} art="spiral-calendar" loading={L} to="/safeguarding" />
      </Group>
      <Group title="Reporting & follow-up" description="What CQC checks first: prompt referral decisions and active case management">
        <Kpi label="LA referral pending" value={d?.laPending} art="outbox-tray" tone={attn(d?.laPending, 'bad')} loading={L} to="/safeguarding" />
        <Kpi label="CQC decision pending" value={d?.cqcPending} art="classical-building" tone={attn(d?.cqcPending, 'bad')} loading={L} to="/safeguarding" />
        <Kpi label="Reviews overdue" value={d?.reviewsOverdue} art="alarm-clock" tone={attn(d?.reviewsOverdue, 'warn')} loading={L} to="/safeguarding" />
        <Kpi label="No case lead" value={d?.noLead} art="busts-in-silhouette" tone={attn(d?.noLead, 'warn')} loading={L} to="/safeguarding" />
        <Kpi label="Records audit" value={d?.auditPct == null ? null : `${d.auditPct}%`} progress={d?.auditPct} art="clipboard" tone={pctTone} loading={L} to="/safeguarding" hint="CQC records checklist across all cases" />
      </Group>
    </>
  )
}

/* ─── Specialist pathways ────────────────────────────────────────────────── */

function SpecialistPathwaysInsights() {
  const can = useCan()
  const { locationId } = useGlobalLocationScope()
  const ok = can('specialist_pathways.read')
  const q = usePathwaySummary(locationId ?? undefined, ok)
  const d = ok ? q.data : undefined
  const L = q.isLoading
  if (!ok) return null
  const t = d?.totals
  return (
    <>
      <Group title="All pathways" description="Open cases and what needs attention">
        <Kpi label="Open cases" value={t?.open} art="heart-hands" loading={L} hint={`${n0(t?.closed)} closed`} />
        <Kpi label="Reviews overdue" value={t?.reviewsOverdue} art="alarm-clock" tone={attn(t?.reviewsOverdue, 'bad')} loading={L} />
        <Kpi label="Plans awaiting approval" value={t?.plansAwaitingApproval} art="writing-hand" tone={attn(t?.plansAwaitingApproval, 'warn')} loading={L} />
        <Kpi label="Very high risks" value={t?.highRisks} art="red-exclamation-mark" tone={attn(t?.highRisks, 'bad')} loading={L} hint="Open risks scoring 15 or more" />
      </Group>
      {Object.values(PATHWAY_META).map(m => {
        const p = d?.byPathway[m.type]
        const to = `/specialist-pathways/${m.slug}`
        return (
          <Group key={m.type} title={m.label} description={`${n0(p?.open)} open · ${n0(p?.closed)} closed`}>
            <Kpi label="Open cases" value={p?.open} art="clipboard" loading={L} to={to} />
            <Kpi label="Reviews overdue" value={p?.reviewsOverdue} art="alarm-clock" tone={attn(p?.reviewsOverdue, 'bad')} loading={L} to={to} />
            <Kpi label="Plans awaiting approval" value={p?.plansAwaitingApproval} art="writing-hand" tone={attn(p?.plansAwaitingApproval, 'warn')} loading={L} to={to} />
            <Kpi label="Very high risks" value={p?.highRisks} art="red-exclamation-mark" tone={attn(p?.highRisks, 'bad')} loading={L} to={to} />
          </Group>
        )
      })}
    </>
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
  'specialist-pathways': SpecialistPathwaysInsights,
  safeguarding: SafeguardingInsights,
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
