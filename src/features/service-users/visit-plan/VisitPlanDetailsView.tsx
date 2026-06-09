import { User } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { ServiceUserVisitPlan, VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import { resolveCarePlansForSlot } from '@/features/service-users/visit-plan/visit-plan-care-plan-links.util'
import { normalizeTimeForInput } from '@/features/service-users/visit-plan/visit-plan-time.util'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import {
  formatAnalysisArea,
  formatMonthlyDays,
  formatVisitPlanFrequency,
  formatWeekdays,
  formatYesNo,
} from '@/features/service-users/visit-plan/visit-plan-format'

function AssignedCarerBadges({
  employeeIds,
  employeeNameById,
  emptyLabel = 'No carers assigned',
}: {
  employeeIds: string[]
  employeeNameById: Map<string, string>
  emptyLabel?: string
}) {
  if (employeeIds.length === 0) {
    return <span className="text-xs text-muted-foreground">{emptyLabel}</span>
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {employeeIds.map((id) => (
        <li
          key={id}
          className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
        >
          <User className="h-3 w-3 shrink-0" aria-hidden />
          {resolveEmployeeDisplayName(employeeNameById, id)}
        </li>
      ))}
    </ul>
  )
}

function CallPatternOverviewCard({
  slot,
  acceptedCarePlans,
  employeeNameById,
}: {
  slot: VisitPlanSlot
  acceptedCarePlans: AcceptedCarePlanItem[]
  employeeNameById: Map<string, string>
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
        <div>
          <h4 className="text-sm font-semibold text-foreground">{slot.label}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {start} – {end} · {slot.requiredCarers} required
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
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
          <div className="mt-3 flex flex-wrap gap-1">
            {VISIT_PLAN_DAY_LABELS.map((day, dayIndex) => (
              <span
                key={day}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium',
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

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Assigned carers</p>
            <AssignedCarerBadges
              employeeIds={slot.assignedEmployeeIds ?? []}
              employeeNameById={employeeNameById}
            />
          </div>

          {linkedCarePlans.length > 0 ? (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Care plans</p>
              <ul className="flex flex-wrap gap-1.5">
                {linkedCarePlans.map((cp) => (
                  <li
                    key={cp.formId}
                    className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100"
                    title={cp.carePlanArea}
                  >
                    {cp.formName}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">This call slot is not enabled.</p>
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
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide', styles[status])}>
      {status}
    </span>
  )
}

function SlotDetailCard({
  slot,
  acceptedCarePlans,
  employeeNameById,
}: {
  slot: VisitPlanSlot
  acceptedCarePlans: AcceptedCarePlanItem[]
  employeeNameById: Map<string, string>
}) {
  const linkedCarePlans = resolveCarePlansForSlot(slot, acceptedCarePlans)
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{slot.label}</h4>
          <span className="text-xs text-muted-foreground">
            {normalizeTimeForInput(slot.plannedStartTime)} – {normalizeTimeForInput(slot.plannedEndTime)} ·{' '}
            {slot.requiredCarers} carer{slot.requiredCarers === 1 ? '' : 's'} required
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-sky-100 bg-sky-50/50 px-3 py-2.5 dark:border-sky-900 dark:bg-sky-950/20">
        <p className="text-xs font-medium text-sky-900 dark:text-sky-100">Assigned carers</p>
        <div className="mt-1.5">
          <AssignedCarerBadges
            employeeIds={slot.assignedEmployeeIds ?? []}
            employeeNameById={employeeNameById}
          />
        </div>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Frequency</dt>
          <dd>{formatVisitPlanFrequency(slot)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {slot.scheduleFrequency === 'MONTHLY' ? 'Days of month' : 'Weekdays'}
          </dt>
          <dd>{slot.scheduleFrequency === 'MONTHLY' ? formatMonthlyDays(slot) : formatWeekdays(slot)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Time critical</dt>
          <dd>
            {formatYesNo(slot.timeCritical)}
            {slot.timeCritical ? ` (${slot.timeToleranceMinutes} min tolerance)` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd>{slot.durationMinutes ? `${slot.durationMinutes} min` : '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Notes mandatory</dt>
          <dd>{formatYesNo(slot.notesRequired)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Photos allowed</dt>
          <dd>{formatYesNo(slot.photoAllowed)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Share with family</dt>
          <dd>{formatYesNo(slot.shareOutcomeWithFamily)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Analysis area</dt>
          <dd>{formatAnalysisArea(slot.analysisArea)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Care plans on this visit</dt>
          <dd>
            {linkedCarePlans.length === 0 ? (
              '—'
            ) : (
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {linkedCarePlans.map((cp) => (
                  <li
                    key={cp.formId}
                    className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100"
                  >
                    {cp.formName}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      {slot.notes?.trim() ? (
        <p className="mt-3 rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">{slot.notes}</p>
      ) : null}
    </article>
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
  const enabledSlots = (plan.slots ?? []).filter((s) => s.isEnabled)
  const disabledSlots = (plan.slots ?? []).filter((s) => !s.isEnabled)

  return (
    <div className={cn('space-y-6', className)}>
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Visit plan summary</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Authorised care package — call pattern and scheduling rules.
            </p>
          </div>
          {statusBadge(plan.status)}
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Weekly contracted hours</dt>
            <dd className="text-sm font-medium">{plan.weeklyContractedHours ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Default carers per visit</dt>
            <dd className="text-sm font-medium">{plan.numberOfCarers}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Effective from</dt>
            <dd className="text-sm font-medium">
              {plan.effectiveFrom ? new Date(plan.effectiveFrom).toLocaleDateString('en-GB') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Review due</dt>
            <dd className="text-sm font-medium">
              {plan.reviewDueAt ? new Date(plan.reviewDueAt).toLocaleDateString('en-GB') : '—'}
            </dd>
          </div>
        </dl>

        {plan.notes?.trim() ? (
          <div className="mt-4 rounded-md border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">Plan notes</p>
            <p className="mt-1 text-sm">{plan.notes}</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Call pattern</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Each visit slot with assigned carers and linked care plans.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(plan.slots ?? []).map((slot) => (
            <CallPatternOverviewCard
              key={slot.slotCode}
              slot={slot}
              acceptedCarePlans={acceptedCarePlans}
              employeeNameById={employeeNameById}
            />
          ))}
        </div>
        {(plan.slots ?? []).some((s) => s.scheduleFrequency === 'MONTHLY') ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Monthly slots use calendar days — see scheduling details below.
          </p>
        ) : null}
      </section>

      {enabledSlots.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Scheduling details</h3>
          {enabledSlots.map((slot) => (
            <SlotDetailCard
              key={slot.slotCode}
              slot={slot}
              acceptedCarePlans={acceptedCarePlans}
              employeeNameById={employeeNameById}
            />
          ))}
        </section>
      ) : null}

      {disabledSlots.length > 0 ? (
        <section className="rounded-xl border border-dashed border-border bg-muted/10 p-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Disabled slots</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {disabledSlots.map((s) => s.label).join(', ')}
          </p>
        </section>
      ) : null}

      {(plan.amendments ?? []).length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Amendment history</h3>
          <ul className="space-y-2 text-sm">
            {(plan.amendments ?? []).map((a) => (
              <li key={a.id} className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(a.amendedAt).toLocaleString('en-GB')}
                </span>
                <p className="mt-0.5">{a.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
