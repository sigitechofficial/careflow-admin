import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Clock, ExternalLink, User } from 'lucide-react'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import { StandardIconImage } from '@/shared/ui/standard-icon-image'
import { cn } from '@/shared/lib/utils'
import {
  ContentCard,
  contentBadgeClass,
  contentBodyClass,
  contentKickerClass,
  contentHelperClass,
  contentTagClass,
  contentTitleClass,
} from '@/shared/ui/content-section'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import { normalizeTimeForInput } from '@/features/service-users/visit-plan/visit-plan-time.util'
import {
  formatAnalysisArea,
  formatMonthlyDays,
  formatVisitPlanFrequency,
  formatWeekdays,
  formatYesNo,
} from '@/features/service-users/visit-plan/visit-plan-format'
import { resolveCarePlansForSlot } from '@/features/service-users/visit-plan/visit-plan-care-plan-links.util'
import { VisitPlanSlotCarerByDayDetails } from '@/features/service-users/visit-plan/VisitPlanSlotCarerByDayDetails'
import { slotHasCarerByDayAssignments } from '@/features/service-users/visit-plan/visit-plan-carer-by-day.util'
import {
  slotAssignedEmployeeIds,
  slotCarerRoleForEmployee,
} from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import { VisitPlanCarerRoleBadge } from '@/features/service-users/visit-plan/VisitPlanCarerRoleBadge'

function DetailSection({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <ContentCard className={cn('overflow-hidden p-0', className)}>
      <h3 className={cn('border-b border-border bg-muted/30 px-4 py-2.5', contentKickerClass)}>
        {title}
      </h3>
      <div className="p-4">{children}</div>
    </ContentCard>
  )
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <dt className={contentHelperClass}>{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

type Props = {
  slot: VisitPlanSlot
  acceptedCarePlans: AcceptedCarePlanItem[]
  employeeNameById: Map<string, string>
  onClose?: () => void
}

export function VisitPlanSlotCallPatternDetails({
  slot,
  acceptedCarePlans,
  employeeNameById,
  onClose,
}: Props) {
  const linkedPlans = resolveCarePlansForSlot(slot, acceptedCarePlans)
  const assignedIds = slotAssignedEmployeeIds(slot)
  const hasCarerByDay = slotHasCarerByDayAssignments(slot)
  const start = normalizeTimeForInput(slot.plannedStartTime)
  const end = normalizeTimeForInput(slot.plannedEndTime)

  const scheduleDaysLabel =
    slot.scheduleFrequency === 'MONTHLY'
      ? formatMonthlyDays(slot)
      : slot.scheduleFrequency === 'WEEKLY' || slot.scheduleFrequency === 'DAILY'
        ? formatWeekdays(slot)
        : '—'

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-to-br from-teal-50/80 via-card to-card p-4 shadow-sm dark:from-teal-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className={cn('text-lg', contentTitleClass)}>{slot.label}</h4>
            <p className={cn('mt-1 flex items-center gap-1.5', contentBodyClass)}>
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
              {start} – {end}
            </p>
          </div>
          <span
            className={cn(
              'rounded-full px-2.5 py-1',
              contentBadgeClass,
              slot.isEnabled
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {slot.isEnabled ? 'Active' : 'Off'}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md border border-border bg-background/80 px-2 py-1 text-muted-foreground">
            {slot.requiredCarers} carer{slot.requiredCarers === 1 ? '' : 's'} required
          </span>
          {slot.medicationRoundCode ? (
            <span className="rounded-md border border-border bg-background/80 px-2 py-1 text-muted-foreground">
              {slot.label || slot.medicationRoundCode}
            </span>
          ) : null}
        </div>
      </div>

      <DetailSection title="Call pattern">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Visit window" value={`${start} – ${end}`} />
          <DetailField label="Required carers" value={String(slot.requiredCarers)} />
          <DetailField label="Status" value={slot.isEnabled ? 'Enabled' : 'Disabled'} />
        </dl>
      </DetailSection>

      <DetailSection title="Scheduling & visit options">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Frequency" value={formatVisitPlanFrequency(slot)} />
          <DetailField
            label={slot.scheduleFrequency === 'MONTHLY' ? 'Days of month' : 'Visit days'}
            value={scheduleDaysLabel}
          />
          <DetailField
            label="Time critical"
            value={
              slot.timeCritical
                ? `Yes (${slot.timeToleranceMinutes} min tolerance)`
                : formatYesNo(slot.timeCritical)
            }
          />
          <DetailField
            label="Duration"
            value={slot.durationMinutes ? `${slot.durationMinutes} min` : '—'}
          />
          <DetailField label="Notes mandatory" value={formatYesNo(slot.notesRequired)} />
          <DetailField label="Photos allowed" value={formatYesNo(slot.photoAllowed)} />
          <DetailField label="Share with family" value={formatYesNo(slot.shareOutcomeWithFamily)} />
          <DetailField label="Analysis area" value={formatAnalysisArea(slot.analysisArea)} />
        </dl>

        {slot.scheduleFrequency !== 'MONTHLY' ? (
          <div className="mt-4 border-t border-border/60 pt-4">
            <p className={cn('mb-2', contentHelperClass)}>Week overview</p>
            <div className="flex flex-wrap gap-1">
              {VISIT_PLAN_DAY_LABELS.map((day, dayIndex) => (
                <span
                  key={day}
                  className={cn(
                    'rounded px-2 py-1',
                    contentTagClass,
                    slot.daysOfWeek.includes(dayIndex)
                      ? 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-100'
                      : 'bg-muted/40 text-muted-foreground/70',
                  )}
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </DetailSection>

      <DetailSection title="Care plans on this visit">
        {linkedPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No care plans selected for this call.</p>
        ) : (
          <ul className="space-y-2">
            {linkedPlans.map((cp) => (
              <li
                key={cp.formId}
                className="flex items-center gap-3 rounded-lg border border-teal-200/80 bg-teal-50/40 px-3 py-2.5 dark:border-teal-900 dark:bg-teal-950/20"
              >
                <StandardIconImage
                  src={cp.pictureUrl}
                  label={cp.formName}
                  className="h-11 w-11 shrink-0"
                  imgClassName="h-11 w-11"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{cp.formName}</p>
                  <p className={contentHelperClass}>{cp.carePlanArea}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title={hasCarerByDay ? 'Carers by day' : 'Assigned carers'}>
        {hasCarerByDay ? (
          <>
            <p className={cn('mb-3', contentHelperClass)}>
              Day-specific carer rules from advanced visit plan settings.
            </p>
            <VisitPlanSlotCarerByDayDetails
              slot={slot}
              employeeNameById={employeeNameById}
              onClose={onClose}
            />
          </>
        ) : assignedIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No carers assigned to this call yet.</p>
        ) : (
          <ul className="space-y-2">
            {assignedIds.map((id) => {
              const name = resolveEmployeeDisplayName(employeeNameById, id)
              const role = slotCarerRoleForEmployee(slot, id)
              const showRoles = slot.requiredCarers > 1 || assignedIds.length > 1
              return (
                <li key={id}>
                  <Link
                    to="/employee/$employeeId/edit"
                    params={{ employeeId: id }}
                    onClick={onClose}
                    className="group flex items-center gap-3 rounded-lg border border-sky-200/80 bg-sky-50/40 px-3 py-2.5 transition-colors hover:border-sky-300 hover:bg-sky-50 dark:border-sky-900 dark:bg-sky-950/20 dark:hover:border-sky-700 dark:hover:bg-sky-950/40"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100">
                      <User className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground group-hover:text-sky-900 dark:group-hover:text-sky-100">
                          {name}
                        </p>
                        {showRoles ? <VisitPlanCarerRoleBadge role={role} /> : null}
                      </div>
                      <p className={contentHelperClass}>
                        {showRoles
                          ? role === 'LEAD'
                            ? 'Lead carer · View employee profile'
                            : 'Secondary carer · View employee profile'
                          : 'View employee profile'}
                      </p>
                    </div>
                    <ExternalLink
                      className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-sky-700 dark:group-hover:text-sky-300"
                      aria-hidden
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </DetailSection>

      {slot.notes?.trim() ? (
        <DetailSection title="Slot notes">
          <p className="text-sm leading-relaxed text-muted-foreground">{slot.notes.trim()}</p>
        </DetailSection>
      ) : null}
    </div>
  )
}
