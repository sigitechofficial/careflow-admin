import { ClipboardList, Clock3, History, LayoutGrid, User, AlertTriangle } from 'lucide-react'
import { cn, formatDate, formatDateTime } from '@/shared/lib/utils'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type {
  ServiceUserVisitPlan,
  VisitPlanCarerCandidate,
  VisitPlanSlot,
} from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import { resolveCarePlansForSlot } from '@/features/service-users/visit-plan/visit-plan-care-plan-links.util'
import { normalizeTimeForInput } from '@/features/service-users/visit-plan/visit-plan-time.util'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import { slotAssignedEmployeeIds } from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import { slotHasCarerByDayAssignments } from '@/features/service-users/visit-plan/visit-plan-carer-by-day.util'
import { VisitPlanSlotCarerByDaySummaryList } from '@/features/service-users/visit-plan/VisitPlanSlotCarerByDaySummaryList'
import { VisitPlanWeeklyHoursPanel } from '@/features/service-users/visit-plan/VisitPlanWeeklyHoursPanel'
import { VisitPlanIaPreferredVisitTimesPanel } from '@/features/service-users/visit-plan/VisitPlanIaPreferredVisitTimesPanel'
import {
  carerAssignmentCoversSlotDays,
  formatCarerAvailabilityWarning,
} from '@/features/service-users/visit-plan/visit-plan-carer-availability-warning.util'
import { useVisitPlanSlotCarerSuggestions } from '@/features/service-users/visit-plan/useVisitPlanSlotCarerSuggestions'
import {
  formatAnalysisArea,
  formatMonthlyDays,
  formatVisitPlanFrequency,
  formatWeekdays,
  formatYesNo,
} from '@/features/service-users/visit-plan/visit-plan-format'
import { TimeCriticalDot } from '@/features/service-users/visit-plan/TimeCriticalDot'
import {
  contentAlertClass,
  contentBadgeClass,
  contentBodyClass,
  contentHelperClass,
  contentOverlineClass,
  contentTagClass,
  contentTitleClass,
  ContentCard,
  ContentSectionHeader,
} from '@/shared/ui/content-section'

function AssignedCarerBadges({
  employeeIds,
  employeeNameById,
  emptyLabel = 'No carers assigned',
  slot,
  carerCandidatesByEmployeeId,
}: {
  employeeIds: string[]
  employeeNameById: Map<string, string>
  emptyLabel?: string
  slot?: VisitPlanSlot
  carerCandidatesByEmployeeId?: Map<string, VisitPlanCarerCandidate>
}) {
  if (employeeIds.length === 0) {
    return <span className={contentHelperClass}>{emptyLabel}</span>
  }

  const coveredDays = slot ? carerAssignmentCoversSlotDays(null, slot.daysOfWeek) : []

  return (
    <ul className="space-y-2">
      {employeeIds.map((id) => {
        const availabilityWarning =
          slot && carerCandidatesByEmployeeId
            ? formatCarerAvailabilityWarning(carerCandidatesByEmployeeId.get(id), coveredDays)
            : null

        return (
          <li key={id}>
            <span
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
            >
              <User className="h-3 w-3 shrink-0" aria-hidden />
              {resolveEmployeeDisplayName(employeeNameById, id)}
            </span>
            {availabilityWarning ? (
              <p
                className={cn('mt-1 flex items-start gap-1', contentAlertClass)}
                role="status"
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                <span>{availabilityWarning}</span>
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function SlotAssignedCarersDisplay({
  slot,
  employeeNameById,
  dense = false,
  emptyLabel = 'No carers assigned',
  carerCandidatesByEmployeeId,
}: {
  slot: VisitPlanSlot
  employeeNameById: Map<string, string>
  dense?: boolean
  emptyLabel?: string
  carerCandidatesByEmployeeId?: Map<string, VisitPlanCarerCandidate>
}) {
  const hasCarerByDay = slotHasCarerByDayAssignments(slot)

  if (hasCarerByDay) {
    return (
      <VisitPlanSlotCarerByDaySummaryList
        slot={slot}
        employeeNameById={employeeNameById}
        variant="sky"
        dense={dense}
        carerCandidatesByEmployeeId={carerCandidatesByEmployeeId}
      />
    )
  }

  return (
    <AssignedCarerBadges
      employeeIds={slotAssignedEmployeeIds(slot)}
      employeeNameById={employeeNameById}
      emptyLabel={emptyLabel}
      slot={slot}
      carerCandidatesByEmployeeId={carerCandidatesByEmployeeId}
    />
  )
}

function CallPatternOverviewCard({
  slot,
  acceptedCarePlans,
  employeeNameById,
  carerCandidatesByEmployeeId,
}: {
  slot: VisitPlanSlot
  acceptedCarePlans: AcceptedCarePlanItem[]
  employeeNameById: Map<string, string>
  carerCandidatesByEmployeeId?: Map<string, VisitPlanCarerCandidate>
}) {
  const linkedCarePlans = resolveCarePlansForSlot(slot, acceptedCarePlans)
  const start = normalizeTimeForInput(slot.plannedStartTime)
  const end = normalizeTimeForInput(slot.plannedEndTime)

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-lg border border-border bg-card p-4 shadow-sm',
        !slot.isEnabled && 'opacity-55',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
            <Clock3 className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h4 className={cn('flex items-center gap-1.5', contentTitleClass)}>
              {slot.timeCritical ? (
                <TimeCriticalDot toleranceMinutes={slot.timeToleranceMinutes} size="xs" />
              ) : null}
              {slot.label}
            </h4>
            <p className={cn('mt-0.5', contentHelperClass)}>
              {start} – {end} · {slot.requiredCarers} required
            </p>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5',
            contentBadgeClass,
            slot.isEnabled
              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {slot.isEnabled ? 'On' : 'Off'}
        </span>
      </div>

      {slot.isEnabled ? (
        <>
          <div className="mt-3">
            <p className={cn('mb-1', contentOverlineClass)}>
              Visit runs on
            </p>
            <div className="flex flex-wrap gap-1">
            {VISIT_PLAN_DAY_LABELS.map((day, dayIndex) => (
              <span
                key={day}
                className={cn(
                  'rounded px-1.5 py-0.5',
                  contentTagClass,
                  slot.scheduleFrequency === 'MONTHLY'
                    ? 'bg-muted/40 text-muted-foreground'
                    : slot.daysOfWeek.includes(dayIndex)
                      ? 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-100'
                      : 'bg-muted/30 text-muted-foreground/60',
                )}
                title={day}
              >
                {day.slice(0, 3)}
              </span>
            ))}
            </div>
          </div>

          <div className="mt-4">
            <p className={cn('mb-1.5', contentOverlineClass)}>
              {slotHasCarerByDayAssignments(slot) ? 'Carers by day' : 'Assigned carers'}
            </p>
            <SlotAssignedCarersDisplay
              slot={slot}
              employeeNameById={employeeNameById}
              dense
              carerCandidatesByEmployeeId={carerCandidatesByEmployeeId}
            />
          </div>

          {linkedCarePlans.length > 0 ? (
            <div className="mt-3">
              <p className={cn('mb-1.5', contentOverlineClass)}>Care plans</p>
              <ul className="flex flex-wrap gap-1.5">
                {linkedCarePlans.map((cp) => (
                  <li
                    key={cp.formId}
                    className={cn(
                      'rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100',
                      contentTagClass,
                    )}
                    title={cp.carePlanArea}
                  >
                    {cp.formName}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <dl className="mt-4 grid gap-2 border-t border-border/60 pt-3 text-sm sm:grid-cols-2">
            <div>
              <dt className={contentHelperClass}>Frequency</dt>
              <dd>{formatVisitPlanFrequency(slot)}</dd>
            </div>
            {slot.scheduleFrequency === 'MONTHLY' ? (
              <div>
                <dt className={contentHelperClass}>Days of month</dt>
                <dd>{formatMonthlyDays(slot)}</dd>
              </div>
            ) : slot.scheduleFrequency !== 'DAILY' ? (
              <div>
                <dt className={contentHelperClass}>Weekdays</dt>
                <dd>{formatWeekdays(slot)}</dd>
              </div>
            ) : null}
            <div>
              <dt className={contentHelperClass}>Time critical</dt>
              <dd>
                {formatYesNo(slot.timeCritical)}
                {slot.timeCritical ? ` (${slot.timeToleranceMinutes} min tolerance)` : ''}
              </dd>
            </div>
            <div>
              <dt className={contentHelperClass}>Duration</dt>
              <dd>{slot.durationMinutes ? `${slot.durationMinutes} min` : '—'}</dd>
            </div>
            <div>
              <dt className={contentHelperClass}>Notes mandatory</dt>
              <dd>{formatYesNo(slot.notesRequired)}</dd>
            </div>
            <div>
              <dt className={contentHelperClass}>Photos allowed</dt>
              <dd>{formatYesNo(slot.photoAllowed)}</dd>
            </div>
            <div>
              <dt className={contentHelperClass}>Share with family</dt>
              <dd>{formatYesNo(slot.shareOutcomeWithFamily)}</dd>
            </div>
            <div>
              <dt className={contentHelperClass}>Analysis area</dt>
              <dd>{formatAnalysisArea(slot.analysisArea)}</dd>
            </div>
          </dl>

          {slot.notes?.trim() ? (
            <p className="mt-3 rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">{slot.notes}</p>
          ) : null}
        </>
      ) : (
        <p className={contentHelperClass}>This call slot is not enabled.</p>
      )}
    </article>
  )
}

function statusBadge(status: ServiceUserVisitPlan['status']) {
  const styles: Record<ServiceUserVisitPlan['status'], string> = {
    DRAFT: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    ACTIVE: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    SUSPENDED: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
    ENDED: 'bg-muted text-muted-foreground',
  }
  return (
    <span className={cn('rounded-full px-2.5 py-0.5', contentBadgeClass, styles[status])}>
      {status}
    </span>
  )
}

type Props = {
  plan: ServiceUserVisitPlan
  acceptedCarePlans?: AcceptedCarePlanItem[]
  employeeNameById?: Map<string, string>
  className?: string
}

export function VisitPlanDetailsView({
  plan,
  acceptedCarePlans = [],
  employeeNameById = new Map(),
  className,
}: Props) {
  const disabledSlots = (plan.slots ?? []).filter((s) => !s.isEnabled)
  const { candidatesForSlot } = useVisitPlanSlotCarerSuggestions(plan.serviceUserId, plan.slots ?? [])

  return (
    <div className={cn('space-y-6', className)}>
      <VisitPlanIaPreferredVisitTimesPanel serviceUserId={plan.serviceUserId} />

      <ContentCard>
        <ContentSectionHeader
          icon={<ClipboardList className="h-5 w-5" aria-hidden />}
          iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
          title="Visit plan summary"
          description="Authorised care package — call pattern and scheduling rules."
          action={statusBadge(plan.status)}
        />

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className={contentHelperClass}>Weekly contracted hours</dt>
            <dd className="text-sm font-medium">{plan.weeklyContractedHours ?? '—'}</dd>
          </div>
          <div>
            <dt className={contentHelperClass}>Default carers per visit</dt>
            <dd className="text-sm font-medium">{plan.numberOfCarers}</dd>
          </div>
          <div>
            <dt className={contentHelperClass}>Effective from</dt>
            <dd className="text-sm font-medium">
              {formatDate(plan.effectiveFrom)}
            </dd>
          </div>
          <div>
            <dt className={contentHelperClass}>Effective to</dt>
            <dd className="text-sm font-medium">
              {plan.effectiveTo
                ? formatDate(plan.effectiveTo)
                : plan.status === 'ACTIVE'
                  ? 'Ongoing'
                  : '—'}
            </dd>
          </div>
          <div>
            <dt className={contentHelperClass}>Review due</dt>
            <dd className="text-sm font-medium">
              {formatDate(plan.reviewDueAt)}
            </dd>
          </div>
        </dl>

        <VisitPlanWeeklyHoursPanel
          className="mt-4"
          slots={plan.slots ?? []}
          weeklyContractedHours={plan.weeklyContractedHours ?? ''}
          anchorIso={plan.effectiveFrom}
        />

        {plan.notes?.trim() ? (
          <div className="mt-4 rounded-md border border-border/60 bg-muted/20 px-4 py-3">
            <p className={contentOverlineClass}>Plan notes</p>
            <p className="mt-1 text-sm">{plan.notes}</p>
          </div>
        ) : null}
      </ContentCard>

      <ContentCard>
        <ContentSectionHeader
          icon={<LayoutGrid className="h-5 w-5" aria-hidden />}
          iconClassName="bg-teal-500/10 text-teal-700 dark:text-teal-300"
          title="Call pattern"
          description="One card per call slot — schedule, assigned carers, care plans, and documentation rules."
          className="mb-4"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(plan.slots ?? []).map((slot) => (
            <CallPatternOverviewCard
              key={slot.slotCode}
              slot={slot}
              acceptedCarePlans={acceptedCarePlans}
              employeeNameById={employeeNameById}
              carerCandidatesByEmployeeId={candidatesForSlot(slot.slotCode)}
            />
          ))}
        </div>
      </ContentCard>

      {disabledSlots.length > 0 ? (
        <ContentCard className="border-dashed bg-muted/10 p-4">
          <h3 className={cn(contentTitleClass, 'text-muted-foreground')}>Disabled slots</h3>
          <p className={cn('mt-1', contentBodyClass)}>
            {disabledSlots.map((s) => s.label).join(', ')}
          </p>
        </ContentCard>
      ) : null}

      {(plan.amendments ?? []).length > 0 ? (
        <ContentCard>
          <ContentSectionHeader
            icon={<History className="h-5 w-5" aria-hidden />}
            iconClassName="bg-violet-500/10 text-violet-700 dark:text-violet-300"
            title="Amendment history"
            className="mb-3"
          />
          <ul className="space-y-2 text-sm">
            {(plan.amendments ?? []).map((a) => (
              <li key={a.id} className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                <span className={contentHelperClass}>
                  {formatDateTime(a.amendedAt)}
                </span>
                <p className="mt-0.5">{a.reason}</p>
              </li>
            ))}
          </ul>
        </ContentCard>
      ) : null}
    </div>
  )
}
