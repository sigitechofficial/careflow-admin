import * as React from 'react'
import { CalendarOff, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn, formatDate } from '@/shared/lib/utils'
import type { MedicationRoundRow } from '@/features/settings/api/medication-settings.api'
import { sortMedicationRounds } from '@/features/service-users/medication/medication-time-slots'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { formatSlotAssignedCarersSummary } from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import { formatVisitPlanNightDuty } from '@/features/service-users/visit-plan/visit-plan-night-duty.util'
import { visitPlanSlotRoundCode } from '@/features/service-users/visit-plan/visit-plan-time-slots.util'
import { formatVisitPlanWeekdays } from '@/features/service-users/visit-plan/visit-plan-visit-overlap.util'
import { roundVisual } from '@/features/service-users/visit-tasks/visit-task-planner-visual.util'

type Props = {
  rounds: MedicationRoundRow[]
  slots: VisitPlanSlot[]
  employeeNameById: Map<string, string>
  dateChangeCountBySlotId: Map<string, number>
  selectedSlotCode: string
  onSelect: (slotCode: string) => void
  onAddVisit: (roundCode: string) => void
  onEditVisit: (slotCode: string) => void
  onRemoveVisit: (slotCode: string) => void
  onOpenDateChanges: () => void
}

function visitDaysSummary(slot: VisitPlanSlot): string {
  if (slot.slotKind === 'ONE_OFF') {
    return slot.oneOffDate ? `One-off · ${formatDate(slot.oneOffDate.slice(0, 10))}` : 'One-off · no date set'
  }
  if (slot.scheduleFrequency === 'MONTHLY') {
    return slot.repeatEvery > 1 ? `Every ${slot.repeatEvery} months` : 'Monthly'
  }
  if (!slot.daysOfWeek.length) return 'No days chosen'
  const days = formatVisitPlanWeekdays(slot.daysOfWeek)
  const label = days === 'every day' ? 'Every day' : days
  if (slot.repeatEvery > 1) {
    return `${label} · every ${slot.repeatEvery} ${slot.scheduleFrequency === 'WEEKLY' ? 'weeks' : 'days'}`
  }
  return label
}

function visitDatesSummary(slot: VisitPlanSlot): string | null {
  if (slot.slotKind === 'ONE_OFF') return null
  const from = slot.slotEffectiveFrom?.slice(0, 10)
  const to = slot.slotEffectiveTo?.slice(0, 10)
  if (from && to) return `${formatDate(from)} to ${formatDate(to)}`
  if (to) return `Until ${formatDate(to)}`
  if (from) return `From ${formatDate(from)}`
  return null
}

/**
 * The visit schedule grouped by time slot. Each slot opens and closes, lists its visits and has
 * its own "Add visit" — a slot can hold any number of visits, or none.
 */
export function VisitPlanSlotGroups({
  rounds,
  slots,
  employeeNameById,
  dateChangeCountBySlotId,
  selectedSlotCode,
  onSelect,
  onAddVisit,
  onEditVisit,
  onRemoveVisit,
  onOpenDateChanges,
}: Props) {
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  const sortedRounds = React.useMemo(() => sortMedicationRounds(rounds), [rounds])

  const visitsByRound = React.useMemo(() => {
    const map = new Map<string, VisitPlanSlot[]>()
    for (const slot of slots) {
      if (!slot.isEnabled) continue
      const code = visitPlanSlotRoundCode(slot)
      map.set(code, [...(map.get(code) ?? []), slot])
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.plannedStartTime.localeCompare(b.plannedStartTime))
    }
    return map
  }, [slots])

  const toggle = (code: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })

  return (
    <div className="space-y-3" data-testid="visit-plan-slot-groups">
      {sortedRounds.map((round) => {
        const visits = visitsByRound.get(round.code) ?? []
        const isCollapsed = collapsed.has(round.code)
        const windowLabel = round.windowStart && round.windowEnd ? `${round.windowStart}–${round.windowEnd}` : null
        // Same icon and colour per time slot as the Tasks planner.
        const visual = roundVisual(round.code)
        const RoundIcon = visual.icon
        return (
          <div
            key={round.code}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            data-testid={`visit-plan-slot-${round.code}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-muted/30 px-4 py-3">
              <button
                type="button"
                onClick={() => toggle(round.code)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1',
                    visual.surfaceClass,
                    visual.ringClass,
                  )}
                >
                  <RoundIcon className={cn('h-4 w-4', visual.iconClass)} aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-sm font-semibold text-foreground">{round.name}</h4>
                    {windowLabel ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {windowLabel}
                      </span>
                    ) : null}
                    {visits.length > 0 ? (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                        {visits.length}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isCollapsed
                      ? `Hidden · ${visits.length} visit${visits.length === 1 ? '' : 's'}`
                      : visits.length > 0
                        ? `${visits.length} visit${visits.length === 1 ? '' : 's'} planned`
                        : 'No visit added yet'}
                  </p>
                </div>
              </button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1 rounded-lg border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => onAddVisit(round.code)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add visit
              </Button>
            </div>

            {!isCollapsed ? (
              visits.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onAddVisit(round.code)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-primary/5"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Plus className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    No visit added yet — add the first one for this time slot.
                  </span>
                </button>
              ) : (
                <ul className="divide-y divide-border/70">
                  {visits.map((slot) => {
                    const dateChangeCount = slot.id ? (dateChangeCountBySlotId.get(slot.id) ?? 0) : 0
                    const dates = visitDatesSummary(slot)
                    const carePlanCount = slot.linkedCarePlanFormIds?.length ?? 0
                    return (
                      <li
                        key={slot.slotCode}
                        className={cn(
                          'flex cursor-pointer flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 hover:bg-muted/40',
                          selectedSlotCode === slot.slotCode && 'bg-teal-50/90 dark:bg-teal-950/30',
                        )}
                        onClick={() => onSelect(slot.slotCode)}
                        data-testid={`visit-plan-visit-${slot.slotCode}`}
                      >
                        <div className="w-32 shrink-0">
                          <p className="text-sm font-semibold tabular-nums text-foreground">
                            {slot.plannedStartTime}–{slot.plannedEndTime}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {slot.durationMinutes ? `${slot.durationMinutes} mins` : 'No duration'}
                            {slot.nightDuty !== 'NONE' ? ` · ${formatVisitPlanNightDuty(slot.nightDuty)}` : ''}
                          </p>
                        </div>
                        <div className="min-w-[10rem] flex-1">
                          <p className="text-sm text-foreground">{visitDaysSummary(slot)}</p>
                          {dates ? <p className="text-xs text-muted-foreground">{dates}</p> : null}
                        </div>
                        <div className="min-w-[10rem] flex-1">
                          <p className="text-sm text-foreground" title={formatSlotAssignedCarersSummary(slot, employeeNameById)}>
                            {formatSlotAssignedCarersSummary(slot, employeeNameById)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {slot.requiredCarers} carer{slot.requiredCarers === 1 ? '' : 's'} needed
                            {carePlanCount > 0 ? ` · ${carePlanCount} care plan${carePlanCount === 1 ? '' : 's'}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {dateChangeCount > 0 ? (
                            <Button type="button" variant="outline" size="sm" className="h-8" onClick={onOpenDateChanges}>
                              <CalendarOff className="mr-1 h-3.5 w-3.5" />
                              {dateChangeCount} date change{dateChangeCount === 1 ? '' : 's'}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => onEditVisit(slot.slotCode)}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive hover:text-destructive"
                            aria-label={`Remove ${round.name} visit at ${slot.plannedStartTime}`}
                            onClick={() => onRemoveVisit(slot.slotCode)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
