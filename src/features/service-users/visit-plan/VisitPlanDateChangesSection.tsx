import * as React from 'react'
import { CalendarOff, CalendarPlus, CalendarRange, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { ContentCard, ContentSectionHeader, contentHelperClass } from '@/shared/ui/content-section'
import { cn, formatDate } from '@/shared/lib/utils'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import { VISIT_CHARGE_DECISION_OPTIONS } from '@/features/scheduling/utils/visit-cancellation.constants'
import type { VisitPlanSlot, VisitPlanStatus } from '@/features/service-users/visit-plan/types'
import { VisitPlanAddExtraVisitsDialog } from '@/features/service-users/visit-plan/VisitPlanAddExtraVisitsDialog'
import { VisitPlanCancelVisitsDialog } from '@/features/service-users/visit-plan/VisitPlanCancelVisitsDialog'
import { todayIsoDate } from '@/features/service-users/visit-plan/visit-plan-generate-rota.util'
import {
  useVisitPlanDateChanges,
  visitCancelledByLabel,
  type VisitPlanDateChange,
} from '@/features/service-users/visit-plan/visit-plan-date-changes.api'

type Props = {
  serviceUserId: string
  planId: string | undefined
  planStatus: VisitPlanStatus | null
  slots: VisitPlanSlot[]
  usualCarerIds: string[]
  defaultRequiredCarers: number
  className?: string
}

function weekdayLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00.000Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
}

function billingLabel(change: VisitPlanDateChange): string | null {
  if (!change.chargeDecision) return null
  return VISIT_CHARGE_DECISION_OPTIONS.find((o) => o.value === change.chargeDecision)?.label ?? null
}

/** Second line of a change: who and why for a cancellation; reason and carers for an extra visit. */
function changeDetails(change: VisitPlanDateChange, carerNames: string): string {
  if (change.source === 'ABSENCE') return 'Service user absence'
  if (change.type === 'EXTRA') {
    const reason = change.notes.split('\n')[0]?.trim()
    return [reason || null, carerNames ? `Carers: ${carerNames}` : 'No carer chosen'].filter(Boolean).join(' · ')
  }
  const reason =
    change.cancelledByParty === 'OTHER'
      ? change.cancelledByDescription?.trim() || 'Other'
      : (change.reasonLabel ?? change.notes.trim()) || null
  return [
    change.cancelledByParty ? visitCancelledByLabel(change.cancelledByParty) : null,
    reason,
    billingLabel(change),
  ]
    .filter(Boolean)
    .join(' · ')
}

function ChangeRow({ change, employeeNameById }: { change: VisitPlanDateChange; employeeNameById: Map<string, string> }) {
  const isCancel = change.type === 'CANCELLED'
  const carerNames = change.assignedEmployeeIds.map((id) => employeeNameById.get(id) ?? 'Carer').join(', ')
  return (
    <li className="flex flex-wrap items-start gap-x-5 gap-y-1 px-4 py-3" data-testid="date-change-row">
      <div className="w-24 shrink-0">
        <p className="text-sm font-semibold tabular-nums text-foreground">{formatDate(change.date)}</p>
        <p className="text-xs text-muted-foreground">{weekdayLabel(change.date)}</p>
      </div>
      <div className="min-w-[12rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{change.slotLabel}</span>
          <span className="text-sm tabular-nums text-muted-foreground">
            {change.plannedStartTime}–{change.plannedEndTime}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-medium',
              isCancel
                ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
            )}
          >
            {isCancel ? 'Cancelled' : 'Extra visit'}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground" title={change.notes || undefined}>
          {changeDetails(change, carerNames)}
        </p>
      </div>
      <div className="shrink-0 text-right text-xs text-muted-foreground">
        <p>{change.source === 'ABSENCE' ? 'From absence' : (change.recordedByName ?? '—')}</p>
        <p>{formatDate(change.recordedAt)}</p>
      </div>
    </li>
  )
}

/**
 * Plan-level one-off changes: cancel planned visits (any slot) or add extra ones on chosen dates.
 * Saved from their own dialogs straight away — never through the visit plan's save button.
 */
export function VisitPlanDateChangesSection({
  serviceUserId,
  planId,
  planStatus,
  slots,
  usualCarerIds,
  defaultRequiredCarers,
  className,
}: Props) {
  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [extraOpen, setExtraOpen] = React.useState(false)
  const changesQuery = useVisitPlanDateChanges(serviceUserId, planId)
  const isActive = planStatus === 'ACTIVE'

  const { upcoming, past } = React.useMemo(() => {
    const today = todayIsoDate()
    const changes = changesQuery.data?.changes ?? []
    const byDateThenTime = (a: VisitPlanDateChange, b: VisitPlanDateChange) =>
      a.date.localeCompare(b.date) || a.plannedStartTime.localeCompare(b.plannedStartTime)
    return {
      upcoming: changes.filter((c) => c.date >= today).sort(byDateThenTime),
      // Most recent first, so the latest history is on top.
      past: changes.filter((c) => c.date < today).sort((a, b) => byDateThenTime(b, a)),
    }
  }, [changesQuery.data])

  const employeeNameById = useEmployeeNameMap(
    React.useMemo(
      () => [...new Set((changesQuery.data?.changes ?? []).flatMap((c) => c.assignedEmployeeIds))],
      [changesQuery.data],
    ),
  )

  return (
    <ContentCard className={cn('space-y-4', className)} data-testid="visit-plan-date-changes">
      <ContentSectionHeader
        icon={<CalendarRange className="h-5 w-5" aria-hidden />}
        iconClassName="bg-amber-500/10 text-amber-700 dark:text-amber-300"
        title="Changes for specific dates"
        titleAs="h3"
        description={
          <>
            Cancel a planned visit or add an extra one. The regular weekly schedule stays the same. Changes save
            straight away — not with Save draft or Record amendment.
          </>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!isActive || !planId}
              onClick={() => setCancelOpen(true)}
            >
              <CalendarOff className="mr-1 h-3.5 w-3.5" />
              Cancel visits
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!isActive || !planId}
              onClick={() => setExtraOpen(true)}
            >
              <CalendarPlus className="mr-1 h-3.5 w-3.5" />
              Add extra visits
            </Button>
          </div>
        }
      />

      {!isActive ? (
        <p className={contentHelperClass}>
          Available once the visit plan is active — there are no rota visits to change before then.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border/80 bg-muted/30 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming {upcoming.length > 0 ? `(${upcoming.length})` : ''}
          </p>
        </div>
        {upcoming.length === 0 ? (
          <p className={cn('px-4 py-4', contentHelperClass)} data-testid="date-changes-upcoming-empty">
            No upcoming changes. All visits follow the regular schedule.
          </p>
        ) : (
          <ul className="divide-y divide-border/70" data-testid="date-changes-upcoming">
            {upcoming.map((change) => (
              <ChangeRow key={change.id} change={change} employeeNameById={employeeNameById} />
            ))}
          </ul>
        )}
      </div>

      {past.length > 0 ? (
        <details className="group/past overflow-hidden rounded-xl border border-border" data-testid="date-changes-past">
          <summary className="flex cursor-pointer list-none items-center gap-2 bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-open/past:rotate-90" aria-hidden />
            Past ({past.length})
          </summary>
          <ul className="divide-y divide-border/70 border-t border-border/80">
            {past.map((change) => (
              <ChangeRow key={change.id} change={change} employeeNameById={employeeNameById} />
            ))}
          </ul>
        </details>
      ) : null}

      {planId ? (
        <>
          <VisitPlanCancelVisitsDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            serviceUserId={serviceUserId}
            planId={planId}
          />
          <VisitPlanAddExtraVisitsDialog
            open={extraOpen}
            onOpenChange={setExtraOpen}
            serviceUserId={serviceUserId}
            planId={planId}
            slots={slots}
            usualCarerIds={usualCarerIds}
            defaultRequiredCarers={defaultRequiredCarers}
          />
        </>
      ) : null}
    </ContentCard>
  )
}
