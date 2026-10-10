import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import { StatCard, type StatCardTone } from '@/shared/ui/card'
import { useAuthStore } from '@/features/auth/store'
import type { Permission } from '@/features/auth/types'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { fetchInitialAssessmentReviewQueue } from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import { fetchAssessmentReviewQueue } from '@/features/service-users/assessments/api'
import { serviceUserAssessmentKeys } from '@/features/service-users/assessments/keys'
import { fetchCarePlanReviewQueue } from '@/features/service-users/care-plans/api'
import { useScheduleList, useHousekeepingJobsNeedingAttention } from '@/features/scheduling/hooks/useScheduling'
import { useEmployeeChartSummary } from '@/features/employees/hooks/useEmployees'
import { useComplianceBoard } from '@/features/employees/hooks/useEmployeeCompliance'
import { useHoursApprovals } from '@/features/hours-approvals/hooks'
import { useLearningDashboard } from '@/features/learning/hooks/useLearning'
import { useIncidentStats } from '@/features/incidents/hooks/useIncidents'
import { useVisitReconciliationsSummary } from '@/features/billing/hooks/useVisitReconciliations'
import { useInvoiceRunsSummary } from '@/features/billing/hooks/useInvoiceRuns'
import { usePaymentsSummary } from '@/features/billing/hooks/usePayments'
import { usePayrollOverview } from '@/features/payroll/hooks/usePayroll'
import { illustrationSrc } from '@/components/layout/nav-illustrations'
import { useEcmLiveDashboard } from '@/features/ecm/hooks/useEcm'
import { useFundingContractsSummary } from '@/features/billing/hooks/useFundingContracts'
import { useSetupChecklist } from '@/features/setup-checklist/hooks'
import { useMedicationOverview } from '@/features/emar/hooks/useEmar'
import {
  useBodyMapReviewQueue,
  useComplianceSummary,
  usePolicyReviews,
  useServiceUserUpcoming,
  useOperationsOverview,
  useStaffOffToday,
} from '@/features/home/hooks/useHomeSignals'

/**
 * Key figures shown at the top of each module's landing page (/apps/<module>).
 * Every figure comes from an existing endpoint and links to the page behind it.
 * Each figure is its own component so its request only runs when the user may see it.
 */

/** Colourful illustration for a figure (same Fluent Emoji set as the navigation). */
const ill = (name: string) => (
  <img src={illustrationSrc(name)} alt="" aria-hidden="true" draggable={false} className="h-6 w-6 select-none object-contain" />
)

const n = (v: number | undefined | null) => v ?? 0
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

function useCanAny() {
  const can = useAuthStore((s) => s.can)
  return React.useCallback((...perms: Permission[]) => perms.some((p) => can(p)), [can])
}

/** `card` = full stat cards on a module page; `compact` = small figures inside a Home snapshot card. */
type Variant = 'card' | 'compact'
const VariantContext = React.createContext<Variant>('card')

type MetricProps = {
  label: string
  value: number
  hint?: string
  icon: React.ReactNode
  tone: StatCardTone
  loading?: boolean
  /** Omit when there is no page to open (the figure is then plain text). */
  to?: string
}

const ATTENTION_TEXT: Partial<Record<StatCardTone, string>> = {
  rose: 'text-rose-600 dark:text-rose-400',
  amber: 'text-amber-600 dark:text-amber-400',
}

/** One figure. Renders as a stat card on module pages, or a compact link on Home. */
function Metric(props: MetricProps) {
  const variant = React.useContext(VariantContext)
  if (variant === 'card') return <StatCard {...props} />
  const { label, value, hint, loading, to, tone } = props
  const body = (
    <>
      <span
        className={cn(
          'text-xl font-bold tabular-nums leading-tight',
          ATTENTION_TEXT[tone] ?? 'text-foreground',
        )}
      >
        {loading ? '…' : value}
      </span>
      <span className="truncate text-xs text-muted-foreground group-hover:text-foreground">{label}</span>
    </>
  )
  const box = 'group flex min-w-0 flex-col rounded-lg bg-muted/40 px-3 py-2'
  return to ? (
    <Link
      to={to}
      title={hint}
      className={cn(box, 'transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
    >
      {body}
    </Link>
  ) : (
    <div title={hint} className={box}>
      {body}
    </div>
  )
}

function StatRow({ children }: { children: React.ReactNode }) {
  const variant = React.useContext(VariantContext)
  const items = React.Children.toArray(children).filter(Boolean)
  if (items.length === 0) {
    return variant === 'compact' ? (
      <p className="py-2 text-xs text-muted-foreground">No figures for your role here.</p>
    ) : null
  }
  return (
    <div
      className={cn(
        'grid',
        variant === 'compact' ? 'grid-cols-2 gap-2' : 'grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
      )}
      data-testid="module-dashboard"
    >
      {items}
    </div>
  )
}

/* ─── Service users ─────────────────────────────────────────────────────── */

function ActiveServiceUsersStat() {
  const { locationId } = useGlobalLocationScope()
  const q = useServiceUsers({ page: 1, limit: 1, locationId: locationId ?? undefined })
  return (
    <Metric
      label="Service users on the books"
      value={n(q.data?.meta?.total)}
      hint="Receiving care or pre-admission (not discharged)"
      icon={ill('busts-in-silhouette')}
      tone="sky"
      loading={q.isLoading}
      to="/service-users/all"
    />
  )
}

function InitialAssessmentReviewStat() {
  const { locationId } = useGlobalLocationScope()
  const q = useQuery({
    queryKey: initialAssessmentKeys.reviewQueue(false, locationId ?? undefined),
    queryFn: () => fetchInitialAssessmentReviewQueue({ overdueActionsOnly: false, locationId: locationId ?? undefined }),
  })
  const count = q.data?.submissions?.length ?? n(q.data?.total)
  return (
    <Metric
      label="Initial assessments to review"
      value={count}
      hint="Submitted and waiting for a manager"
      icon={ill('clipboard')}
      tone={count > 0 ? 'amber' : 'muted'}
      loading={q.isLoading}
      to="/initial-assessments/review-queue"
    />
  )
}

function AssessmentsDueStat() {
  const { locationId } = useGlobalLocationScope()
  const q = useQuery({
    queryKey: serviceUserAssessmentKeys.reviewQueue(false, undefined, locationId ?? undefined),
    queryFn: () => fetchAssessmentReviewQueue({ overdueOnly: false, locationId: locationId ?? undefined }),
  })
  const overdue = n(q.data?.meta?.overdueCount)
  return (
    <Metric
      label="Assessments overdue"
      value={overdue}
      hint={`${n(q.data?.meta?.dueSoonCount)} due soon`}
      icon={ill('check-mark-button')}
      tone={overdue > 0 ? 'rose' : 'muted'}
      loading={q.isLoading}
      to="/assessments/review-queue"
    />
  )
}

function CarePlanReviewsStat() {
  const { locationId } = useGlobalLocationScope()
  const q = useQuery({
    queryKey: ['care-plan-reviews', 'all', locationId ?? undefined],
    queryFn: () => fetchCarePlanReviewQueue({ status: 'all', locationId: locationId ?? undefined }),
  })
  const overdue = n(q.data?.meta?.overdueCount)
  return (
    <Metric
      label="Care plan reviews overdue"
      value={overdue}
      hint={`${n(q.data?.meta?.dueSoonCount)} due soon`}
      icon={ill('memo')}
      tone={overdue > 0 ? 'rose' : 'muted'}
      loading={q.isLoading}
      to="/care-plans/reviews"
    />
  )
}

function BodyMapReviewStat() {
  const { locationId } = useGlobalLocationScope()
  const q = useBodyMapReviewQueue(locationId, true)
  const count = n(q.data?.total)
  return (
    <Metric
      label="Body map entries to review"
      value={count}
      hint="Recorded by carers, not reviewed yet"
      icon={ill('adhesive-bandage')}
      tone={count > 0 ? 'amber' : 'muted'}
      loading={q.isLoading}
      to="/body-map/review-queue"
    />
  )
}

function ServiceUserExpiriesStat() {
  const { locationId } = useGlobalLocationScope()
  const q = useServiceUserUpcoming(locationId, 30, true)
  const d = q.data
  const cats = d ? [d.dols, d.legalAuthorities, d.documents, d.fundingEnding, d.purchaseOrders, d.fundingReviews, d.visitPlanReviews] : []
  const total = cats.reduce((a, c) => a + c.count, 0)
  const overdue = cats.reduce((a, c) => a + c.overdue, 0)
  return (
    <Metric
      label="Expiries due in 30 days"
      value={total}
      hint={`DoLS, legal authorities, documents, funding and visit plan reviews · ${overdue} overdue`}
      icon={ill('hourglass-not-done')}
      tone={overdue > 0 ? 'rose' : total > 0 ? 'amber' : 'muted'}
      loading={q.isLoading}
    />
  )
}

function ServiceUsersDashboard() {
  const canAny = useCanAny()
  return (
    <StatRow>
      {canAny('service_users.read') ? <ActiveServiceUsersStat key="su" /> : null}
      {canAny('service_users.initial_assessment.review') ? <InitialAssessmentReviewStat key="ia" /> : null}
      {canAny('service_users.assessments.read') ? <AssessmentsDueStat key="as" /> : null}
      {canAny('service_users.read') ? <CarePlanReviewsStat key="cp" /> : null}
      {canAny('service_users.body_map.review', 'service_users.body_map.read', 'service_users.read') ? <BodyMapReviewStat key="bm" /> : null}
      {canAny('service_users.read') ? <ServiceUserExpiriesStat key="exp" /> : null}
    </StatRow>
  )
}

/* ─── Care operations ───────────────────────────────────────────────────── */

const SCHEDULE_READ: Permission[] = ['schedule.read', 'schedules.read', 'scheduled_visits.read', 'scheduled_jobs.read']

function TodayVisitsStats() {
  const today = operationalTodayIso()
  const q = useScheduleList(today)
  const jobs = q.data?.jobs ?? []
  const completed = jobs.filter((j) => j.status === 'COMPLETED').length
  const needCarers = jobs.filter((j) => j.underAllocated || j.needsCover).length
  const late = jobs.filter((j) => j.checkIn?.timingStatus === 'late').length
  return (
    <>
      <Metric
        label="Visits today"
        value={jobs.length}
        hint={`${completed} completed`}
        icon={ill('spiral-calendar')}
        tone="sky"
        loading={q.isLoading}
        to="/scheduling/schedule-jobs"
      />
      <Metric
        label="Visits needing carers"
        value={needCarers}
        hint="Under-allocated or needing cover today"
        icon={ill('woman-health-worker')}
        tone={needCarers > 0 ? 'rose' : 'muted'}
        loading={q.isLoading}
        to="/scheduling/schedule-jobs"
      />
      <Metric
        label="Late check-ins"
        value={late}
        hint="Carers who checked in late today"
        icon={ill('stopwatch')}
        tone={late > 0 ? 'amber' : 'muted'}
        loading={q.isLoading}
        to="/ecm/live"
      />
    </>
  )
}

function VisitsNeedingAttentionStat() {
  const q = useHousekeepingJobsNeedingAttention(1)
  const count = n(q.data?.meta?.total)
  return (
    <Metric
      label="Visits needing attention"
      value={count}
      hint="Jobs to tidy up or close"
      icon={ill('warning')}
      tone={count > 0 ? 'amber' : 'muted'}
      loading={q.isLoading}
      to="/scheduling/jobs"
    />
  )
}

function MissedVisitsStat() {
  const today = operationalTodayIso()
  const { locationId } = useGlobalLocationScope()
  const q = useEcmLiveDashboard({ dateFrom: today, dateTo: today, locationId: locationId ?? undefined })
  const s = q.data?.summary
  const missed = n(s?.potentialMissed) + n(s?.confirmedMissed)
  return (
    <Metric
      label="Missed visits today"
      value={missed}
      hint={`${n(s?.confirmedMissed)} confirmed · ${n(s?.potentialMissed)} at risk`}
      icon={ill('cross-mark')}
      tone={missed > 0 ? 'rose' : 'muted'}
      loading={q.isLoading}
      to="/ecm/live"
    />
  )
}

function WeekCoverStat() {
  const { locationId } = useGlobalLocationScope()
  // Counted in the database: per-day lists are capped at 200 visits and would undercount.
  const q = useOperationsOverview(locationId, true)
  const unfilled = n(q.data?.cover.unfilledNext7)
  return (
    <Metric
      label="Need a carer, next 7 days"
      value={unfilled}
      hint={`${n(q.data?.cover.visitsNext7)} visits scheduled in the next 7 days`}
      icon={ill('calendar')}
      tone={unfilled > 0 ? 'rose' : 'muted'}
      loading={q.isLoading}
      to="/scheduling/schedule-jobs"
    />
  )
}

function OpenAlertsStat() {
  const { locationId } = useGlobalLocationScope()
  const q = useOperationsOverview(locationId, true)
  const open = n(q.data?.alerts.unacknowledged)
  return (
    <Metric
      label="ECM alerts not acknowledged"
      value={open}
      hint={`${n(q.data?.alerts.pastResponseTarget)} past their response target`}
      icon={ill('bell')}
      tone={open > 0 ? 'rose' : 'muted'}
      loading={q.isLoading}
      to="/ecm/live"
    />
  )
}

function CareOperationsDashboard() {
  const canAny = useCanAny()
  const canSchedule = canAny(...SCHEDULE_READ)
  return (
    <StatRow>
      {canSchedule ? <TodayVisitsStats key="today" /> : null}
      {canAny(...SCHEDULE_READ, 'scheduled_jobs_housekeeping.read') ? <VisitsNeedingAttentionStat key="hk" /> : null}
      {canAny('ecm.read', 'ecm.monitor') ? <MissedVisitsStat key="missed" /> : null}
      {canAny('ecm.read', 'ecm.monitor') ? <OpenAlertsStat key="alerts" /> : null}
      {canSchedule ? <WeekCoverStat key="week" /> : null}
    </StatRow>
  )
}

/* ─── Medication (eMAR) ─────────────────────────────────────────────────── */

function MedicationStats() {
  const { locationId } = useGlobalLocationScope()
  const q = useMedicationOverview(locationId, 30, true)
  const d = q.data
  const todayExceptions = n(d?.today.exceptions)
  const unreviewed = n(d?.doses.awaitingReview)
  const onTime = d?.doses.onTimePct
  const noSupportLevel = n(d?.support.notRecorded)
  return (
    <>
      <Metric
        label="Missed or refused today"
        value={todayExceptions}
        hint={`${n(d?.today.byStatus.MISSED)} missed · ${n(d?.today.byStatus.REFUSED)} refused`}
        icon={ill('pill')}
        tone={todayExceptions > 0 ? 'rose' : 'muted'}
        loading={q.isLoading}
        to="/medication/exceptions"
      />
      <Metric
        label="Not reviewed by a manager"
        value={unreviewed}
        hint="Missed or refused doses in the last 30 days with no manager review"
        icon={ill('magnifying-glass-tilted-left')}
        tone={unreviewed > 0 ? 'amber' : 'muted'}
        loading={q.isLoading}
        to="/medication/exceptions"
      />
      <Metric
        label="Given on time (30 days, %)"
        value={onTime ?? 0}
        hint={`${n(d?.doses.late)} given late`}
        icon={ill('stopwatch')}
        tone={onTime === null || onTime === undefined ? 'muted' : onTime >= 90 ? 'emerald' : 'amber'}
        loading={q.isLoading}
        to="/medication/late"
      />
      <Metric
        label="No support level recorded"
        value={noSupportLevel}
        hint={`Of ${n(d?.medicines.serviceUsersOnMedication)} service users on medication`}
        icon={ill('page-facing-up')}
        tone={noSupportLevel > 0 ? 'rose' : 'muted'}
        loading={q.isLoading}
        to="/apps/medication"
      />
    </>
  )
}

function MedicationDashboard() {
  const canAny = useCanAny()
  return <StatRow>{canAny('service_users.read') ? <MedicationStats key="meds" /> : null}</StatRow>
}

/* ─── Workforce ─────────────────────────────────────────────────────────── */

function StaffStats() {
  const q = useEmployeeChartSummary()
  const outstanding = n(q.data?.reviews?.outstanding)
  return (
    <>
      <Metric
        label="Active staff"
        value={n(q.data?.staff?.active)}
        hint={`${n(q.data?.staff?.total)} on record`}
        icon={ill('woman-health-worker')}
        tone="emerald"
        loading={q.isLoading}
        to="/employee/staff-list"
      />
      <Metric
        label="Staff reviews outstanding"
        value={outstanding}
        hint={`${n(q.data?.reviews?.reviewed)} reviewed`}
        icon={ill('handshake')}
        tone={outstanding > 0 ? 'amber' : 'muted'}
        loading={q.isLoading}
        to="/employee/staff-list"
      />
    </>
  )
}

function ExpiredDocumentsStat() {
  const q = useComplianceBoard()
  const expired = n(q.data?.summary?.expiredCount)
  return (
    <Metric
      label="Expired staff documents"
      value={expired}
      hint={`${n(q.data?.summary?.expiring7Count)} expiring within 7 days`}
      icon={ill('identification-card')}
      tone={expired > 0 ? 'rose' : 'muted'}
      loading={q.isLoading}
      to="/employee/compliance"
    />
  )
}

function HoursAwaitingApprovalStat() {
  const q = useHoursApprovals('PENDING')
  const count = q.data?.length ?? 0
  return (
    <Metric
      label="Hours awaiting approval"
      value={count}
      hint="Submitted by staff"
      icon={ill('hourglass-not-done')}
      tone={count > 0 ? 'amber' : 'muted'}
      loading={q.isLoading}
      to="/hours-approvals"
    />
  )
}

function StaffOffStat() {
  const { locationId } = useGlobalLocationScope()
  const q = useStaffOffToday(locationId, true)
  const d = q.data
  return (
    <Metric
      label="Staff off today"
      value={n(d?.total)}
      hint={`${n(d?.sickness)} sick · ${n(d?.holiday)} on holiday · ${n(d?.unauthorised)} unauthorised`}
      icon={ill('face-with-thermometer')}
      tone={n(d?.unauthorised) > 0 ? 'rose' : n(d?.total) > 0 ? 'amber' : 'muted'}
      loading={q.isLoading}
      to="/employee/absences"
    />
  )
}

function MissingDocumentsStat() {
  const { locationId } = useGlobalLocationScope()
  const q = useComplianceSummary(locationId, true)
  const missing = n(q.data?.missing)
  return (
    <Metric
      label="Required documents missing"
      value={missing}
      hint={`${n(q.data?.pendingReview)} uploaded and waiting to be checked`}
      icon={ill('file-folder')}
      tone={missing > 0 ? 'rose' : 'muted'}
      loading={q.isLoading}
      to="/employee/compliance"
    />
  )
}

function WorkforceDashboard() {
  const canAny = useCanAny()
  return (
    <StatRow>
      {canAny('employees.read') ? <StaffStats key="staff" /> : null}
      {canAny('employees.read', 'employees.compliance.read') ? <ExpiredDocumentsStat key="docs" /> : null}
      {canAny('hours_approvals.read', 'hours_approvals.manage') ? <HoursAwaitingApprovalStat key="hours" /> : null}
      {canAny('employees.read', 'employees.reports.read') ? <StaffOffStat key="off" /> : null}
      {canAny('employees.compliance.reports.read') ? <MissingDocumentsStat key="missing" /> : null}
    </StatRow>
  )
}

/* ─── Learning ──────────────────────────────────────────────────────────── */

function LearningStats() {
  const { locationId } = useGlobalLocationScope()
  const q = useLearningDashboard(locationId ?? undefined)
  const d = q.data
  const overdue = n(d?.overdueAssignments)
  const pending = n(d?.externalTrainingPending)
  return (
    <>
      <Metric
        label="Overdue training"
        value={overdue}
        hint={`${plural(n(d?.assignments), 'assignment')} in total`}
        icon={ill('books')}
        tone={overdue > 0 ? 'rose' : 'muted'}
        loading={q.isLoading}
        to="/learning/assignments"
      />
      <Metric
        label="Upcoming training events"
        value={n(d?.upcomingTrainingEvents)}
        hint="Booked sessions"
        icon={ill('teacher')}
        tone="sky"
        loading={q.isLoading}
        to="/learning/training-events"
      />
      <Metric
        label="Active certificates"
        value={n(d?.activeCertificates)}
        hint={`${plural(n(d?.publishedCourses), 'published course')}`}
        icon={ill('scroll')}
        tone="emerald"
        loading={q.isLoading}
        to="/learning/certificates"
      />
      <Metric
        label="External training to approve"
        value={pending}
        hint="Submitted by staff"
        icon={ill('school')}
        tone={pending > 0 ? 'amber' : 'muted'}
        loading={q.isLoading}
        to="/learning/external-training"
      />
      <Metric
        label="Published courses"
        value={n(d?.publishedCourses)}
        hint={`${n(d?.courses)} courses in total`}
        icon={ill('open-book')}
        tone="sky"
        loading={q.isLoading}
        to="/learning/courses"
      />
      <Metric
        label="Training assignments"
        value={n(d?.assignments)}
        hint={`${n(d?.competencies)} competencies set up`}
        icon={ill('spiral-notepad')}
        tone="muted"
        loading={q.isLoading}
        to="/learning/assignments"
      />
    </>
  )
}

function LearningDashboard() {
  const canAny = useCanAny()
  return <StatRow>{canAny('learning.dashboard.read') ? <LearningStats key="l" /> : null}</StatRow>
}

/* ─── Quality & compliance ──────────────────────────────────────────────── */

function IncidentStats() {
  const { locationId } = useGlobalLocationScope()
  const q = useIncidentStats(locationId ?? undefined, true)
  const d = q.data
  const notPickedUp = n(d?.notPickedUp)
  const overdue = n(d?.overdueActions)
  const serious = n(d?.highOrCritical)
  return (
    <>
      <Metric
        label="Open incidents"
        value={n(d?.open)}
        hint={`${n(d?.closedThisMonth)} closed this month`}
        icon={ill('file-cabinet')}
        tone="sky"
        loading={q.isLoading}
        to="/incidents/view"
      />
      <Metric
        label="Not picked up"
        value={notPickedUp}
        hint="Reported, no manager assigned yet"
        icon={ill('inbox-tray')}
        tone={notPickedUp > 0 ? 'amber' : 'muted'}
        loading={q.isLoading}
        to="/incidents/dashboard"
      />
      <Metric
        label="Overdue actions"
        value={overdue}
        hint={`${n(d?.actionsRequired)} actions required`}
        icon={ill('writing-hand')}
        tone={overdue > 0 ? 'rose' : 'muted'}
        loading={q.isLoading}
        to="/incidents/dashboard"
      />
      <Metric
        label="High or critical"
        value={serious}
        hint="Open incidents at these severities"
        icon={ill('red-exclamation-mark')}
        tone={serious > 0 ? 'rose' : 'muted'}
        loading={q.isLoading}
        to="/incidents/view"
      />
    </>
  )
}

function PolicyReviewsStat() {
  const q = usePolicyReviews(30, true)
  const count = n(q.data?.count)
  return (
    <Metric
      label="Policies due for review"
      value={count}
      hint={`${n(q.data?.overdue)} already overdue`}
      icon={ill('ledger')}
      tone={n(q.data?.overdue) > 0 ? 'rose' : count > 0 ? 'amber' : 'muted'}
      loading={q.isLoading}
      to="/policies"
    />
  )
}

function ClosedIncidentsStat() {
  const { locationId } = useGlobalLocationScope()
  const q = useIncidentStats(locationId ?? undefined, true)
  return (
    <Metric
      label="Incidents closed this month"
      value={n(q.data?.closedThisMonth)}
      hint={`${n(q.data?.total)} incidents on record`}
      icon={ill('check-mark-button')}
      tone="emerald"
      loading={q.isLoading}
      to="/incidents/view"
    />
  )
}

function QualityDashboard() {
  const canAny = useCanAny()
  return (
    <StatRow>
      {canAny('incidents.read') ? <IncidentStats key="i" /> : null}
      {canAny('incidents.read') ? <ClosedIncidentsStat key="closed" /> : null}
      {canAny('policies.read') ? <PolicyReviewsStat key="pol" /> : null}
    </StatRow>
  )
}

/* ─── Finance ───────────────────────────────────────────────────────────── */

function VisitsToBillStats() {
  const { locationId } = useGlobalLocationScope()
  const q = useVisitReconciliationsSummary(locationId)
  const exceptions = n(q.data?.visitsWithExceptions)
  return (
    <>
      <Metric
        label="Visits ready to bill"
        value={n(q.data?.visitsReady)}
        hint="Reconciled and approved"
        icon={ill('pound-banknote')}
        tone="emerald"
        loading={q.isLoading}
        to="/billing/visit-reconciliation"
      />
      <Metric
        label="Visits with exceptions"
        value={exceptions}
        hint="Need checking before billing or pay"
        icon={ill('balance-scale')}
        tone={exceptions > 0 ? 'amber' : 'muted'}
        loading={q.isLoading}
        to="/billing/visit-reconciliation"
      />
    </>
  )
}

function InvoiceDraftsStat() {
  const { locationId } = useGlobalLocationScope()
  const q = useInvoiceRunsSummary(locationId)
  return (
    <Metric
      label="Invoice runs in draft"
      value={n(q.data?.invoiceDrafts)}
      hint="Not issued yet"
      icon={ill('receipt')}
      tone="violet"
      loading={q.isLoading}
      to="/billing/invoice-runs"
    />
  )
}

function OverdueInvoicesStat() {
  const q = usePaymentsSummary()
  const overdue = n(q.data?.overdueInvoices)
  return (
    <Metric
      label="Overdue invoices"
      value={overdue}
      hint={`${n(q.data?.unmatchedPayments)} unmatched payments`}
      icon={ill('credit-card')}
      tone={overdue > 0 ? 'rose' : 'muted'}
      loading={q.isLoading}
      to="/billing"
    />
  )
}

function OpenPayrollRunsStat() {
  const q = usePayrollOverview()
  return (
    <Metric
      label="Open UK payroll runs"
      value={n(q.data?.openRuns)}
      hint={`${n(q.data?.readyEmployeeProfiles)} employees ready`}
      icon={ill('bank')}
      tone="primary"
      loading={q.isLoading}
      to="/payroll/runs"
    />
  )
}

function NoFundingStat() {
  const { locationId } = useGlobalLocationScope()
  const q = useFundingContractsSummary(locationId)
  const missing = n(q.data?.missingFundingContracts)
  return (
    <Metric
      label="Not ready to invoice"
      value={missing}
      hint="Service users without a ready funding contract (missing or incomplete)"
      icon={ill('no-entry')}
      tone={missing > 0 ? 'rose' : 'muted'}
      loading={q.isLoading}
      to="/billing"
    />
  )
}

function FinanceDashboard() {
  const canAny = useCanAny()
  return (
    <StatRow>
      {canAny('billing.visit_reconciliations.read') ? <VisitsToBillStats key="v" /> : null}
      {canAny('billing.invoice_runs.read') ? <InvoiceDraftsStat key="inv" /> : null}
      {canAny('billing.payments.read') ? <OverdueInvoicesStat key="pay" /> : null}
      {canAny('payroll.runs.read', 'payroll.settings.read') ? <OpenPayrollRunsStat key="pr" /> : null}
      {canAny('billing.visit_reconciliations.read') ? <NoFundingStat key="nofund" /> : null}
    </StatRow>
  )
}

/* ─── Administration ────────────────────────────────────────────────────── */

function SetupStats() {
  const q = useSetupChecklist()
  const sum = q.data?.summary
  const left = Math.max(0, n(sum?.total) - n(sum?.complete))
  return (
    <>
      <Metric
        label="Setup steps complete"
        value={n(sum?.complete)}
        hint={`${n(sum?.total)} steps in total`}
        icon={ill('check-box-with-check')}
        tone="emerald"
        loading={q.isLoading}
        to="/checklist"
      />
      <Metric
        label="Setup steps left"
        value={left}
        hint="Finish setting up Careflow"
        icon={ill('gear')}
        tone={left > 0 ? 'amber' : 'muted'}
        loading={q.isLoading}
        to="/checklist"
      />
    </>
  )
}

function AdministrationDashboard() {
  const canAny = useCanAny()
  return <StatRow>{canAny('setup_checklist.read') ? <SetupStats key="setup" /> : null}</StatRow>
}

/* ─── Registry ──────────────────────────────────────────────────────────── */

const DASHBOARDS: Record<string, () => React.ReactElement> = {
  'service-users': ServiceUsersDashboard,
  'care-operations': CareOperationsDashboard,
  medication: MedicationDashboard,
  workforce: WorkforceDashboard,
  learning: LearningDashboard,
  'quality-compliance': QualityDashboard,
  finance: FinanceDashboard,
  administration: AdministrationDashboard,
}

/** True when the module has a dashboard (Messages and Reports are page tiles only). */
export function hasModuleDashboard(slug: string): boolean {
  return slug in DASHBOARDS
}

export function ModuleDashboard({ slug }: { slug: string }) {
  const Dashboard = DASHBOARDS[slug]
  return Dashboard ? <Dashboard /> : null
}

/** The same figures as the module page, in compact form for the Home "every module at a glance" cards. */
export function ModuleSnapshot({ slug }: { slug: string }) {
  const Dashboard = DASHBOARDS[slug]
  if (!Dashboard) return null
  return (
    <VariantContext.Provider value="compact">
      <Dashboard />
    </VariantContext.Provider>
  )
}
