import * as React from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, User, Users } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { shiftMedicationChartMonth } from '@/features/service-users/hooks/useMedicationMarChart'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import { normalizeTimeForInput } from '@/features/service-users/visit-plan/visit-plan-time.util'
import {
  slotMatchesPlanDay,
  visitPlanCalendarAnchor,
  visitPlanDayDate,
} from '@/features/service-users/visit-plan/visit-plan-schedule-match.util'
import {
  parseVisitPlanIsoDate,
  shiftVisitPlanIsoDate,
  visitPlanCalendarNavStep,
  visitPlanCalendarPeriodLabel,
  visitPlanDayHeaderLabel,
  visitPlanTodayIsoDate,
  visitPlanVisibleDayCells,
  type VisitPlanCalendarViewMode,
} from '@/features/service-users/visit-plan/visit-plan-calendar-view.util'
import {
  VISIT_PLAN_DAY_LABELS,
  type ServiceUserVisitPlan,
  type VisitPlanSlot,
  type VisitPlanSlotCode,
} from '@/features/service-users/visit-plan/types'
import '@/features/service-users/medication/mar-calendar.css'
import '@/features/service-users/visit-plan/visit-plan-calendar.css'

const SLOT_ROW_CLASS: Record<VisitPlanSlotCode, string> = {
  MORNING: 'vp-slot-morning',
  LUNCH: 'vp-slot-lunch',
  TEA: 'vp-slot-tea',
  EVENING: 'vp-slot-evening',
  NIGHT: 'vp-slot-night',
}

const SLOT_CHIP_CLASS: Record<VisitPlanSlotCode, string> = {
  MORNING: 'vp-chip-morning',
  LUNCH: 'vp-chip-lunch',
  TEA: 'vp-chip-tea',
  EVENING: 'vp-chip-evening',
  NIGHT: 'vp-chip-night',
}

const SLOT_DOT_CLASS: Record<VisitPlanSlotCode, string> = {
  MORNING: 'bg-amber-500',
  LUNCH: 'bg-orange-500',
  TEA: 'bg-sky-500',
  EVENING: 'bg-indigo-500',
  NIGHT: 'bg-violet-500',
}

const VIEW_MODES: { id: VisitPlanCalendarViewMode; label: string }[] = [
  { id: 'daily', label: 'Day' },
  { id: 'weekly', label: 'Week' },
  { id: 'monthly', label: 'Month' },
]

type Props = {
  plan: ServiceUserVisitPlan
  employeeNameById: Map<string, string>
  className?: string
}

function carerLabels(slot: VisitPlanSlot, employeeNameById: Map<string, string>) {
  const ids = slot.assignedEmployeeIds ?? []
  if (ids.length === 0) {
    return { rowLabel: 'Unassigned', cellMark: '—', names: [] as string[] }
  }
  const names = ids.map((id) => resolveEmployeeDisplayName(employeeNameById, id))
  if (ids.length === 1) {
    return { rowLabel: names[0]!, cellMark: '1', names }
  }
  const first = names[0]!
  const shortFirst = first.length > 22 ? `${first.slice(0, 20)}…` : first
  return {
    rowLabel: `${shortFirst} +${ids.length - 1}`,
    cellMark: String(ids.length),
    names,
  }
}

function formatCalendarDateLabel(month: string, day: number): string {
  const date = visitPlanDayDate(month, day)
  const weekday = VISIT_PLAN_DAY_LABELS[date.getUTCDay()] ?? ''
  return `${weekday} ${date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })}`
}

function VisitCalendarCellTooltip({
  slot,
  month,
  day,
  start,
  end,
  carerNames,
}: {
  slot: VisitPlanSlot
  month: string
  day: number
  start: string
  end: string
  carerNames: string[]
}) {
  return (
    <div className="space-y-2.5 text-left">
      <div className="border-b border-border/60 pb-2">
        <p className="font-semibold text-foreground">{slot.label}</p>
        <p className="text-xs text-muted-foreground">{formatCalendarDateLabel(month, day)}</p>
      </div>
      <dl className="space-y-2 text-xs">
        <div className="flex items-start gap-2.5">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden />
          <div>
            <dt className="sr-only">Visit time</dt>
            <dd className="font-semibold text-foreground">
              {start} – {end}
            </dd>
            {slot.durationMinutes ? (
              <dd className="mt-0.5 text-muted-foreground">Duration: {slot.durationMinutes} min</dd>
            ) : null}
            {slot.timeCritical ? (
              <dd className="mt-0.5 text-muted-foreground">
                Time critical · {slot.timeToleranceMinutes} min tolerance
              </dd>
            ) : null}
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden />
          <div>
            <dt className="font-medium text-foreground">
              {slot.requiredCarers} carer{slot.requiredCarers === 1 ? '' : 's'} required
            </dt>
            <dd className="mt-1 text-muted-foreground">
              {carerNames.length === 0 ? (
                'No carers assigned'
              ) : (
                <ul className="space-y-0.5">
                  {carerNames.map((name) => (
                    <li key={name} className="font-medium text-foreground">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </div>
      </dl>
    </div>
  )
}

export function VisitPlanCalendarTab({ plan, employeeNameById, className }: Props) {
  const [viewMode, setViewMode] = React.useState<VisitPlanCalendarViewMode>('monthly')
  const [focusIso, setFocusIso] = React.useState(visitPlanTodayIsoDate)

  const enabledSlots = React.useMemo(
    () => [...(plan.slots ?? [])].filter((s) => s.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [plan.slots],
  )

  const visibleDays = React.useMemo(
    () => visitPlanVisibleDayCells(viewMode, focusIso),
    [viewMode, focusIso],
  )

  const periodLabel = visitPlanCalendarPeriodLabel(viewMode, focusIso)
  const todayIso = visitPlanTodayIsoDate()

  const anchorByMonth = React.useMemo(() => {
    const map = new Map<string, Date>()
    for (const cell of visibleDays) {
      if (!map.has(cell.month)) {
        map.set(cell.month, visitPlanCalendarAnchor(plan.effectiveFrom, cell.month))
      }
    }
    return map
  }, [visibleDays, plan.effectiveFrom])

  const visitsInPeriod = React.useMemo(() => {
    let count = 0
    for (const slot of enabledSlots) {
      for (const cell of visibleDays) {
        const anchor = anchorByMonth.get(cell.month)!
        if (slotMatchesPlanDay(slot, cell.month, cell.day, anchor)) count++
      }
    }
    return count
  }, [enabledSlots, visibleDays, anchorByMonth])

  const goToToday = () => setFocusIso(visitPlanTodayIsoDate())

  const goPrev = () => {
    if (viewMode === 'monthly') {
      const { month } = parseVisitPlanIsoDate(focusIso)
      setFocusIso(`${shiftMedicationChartMonth(month, -1)}-01`)
      return
    }
    setFocusIso((iso) => shiftVisitPlanIsoDate(iso, -visitPlanCalendarNavStep(viewMode)))
  }

  const goNext = () => {
    if (viewMode === 'monthly') {
      const { month } = parseVisitPlanIsoDate(focusIso)
      setFocusIso(`${shiftMedicationChartMonth(month, 1)}-01`)
      return
    }
    setFocusIso((iso) => shiftVisitPlanIsoDate(iso, visitPlanCalendarNavStep(viewMode)))
  }

  const periodSummary =
    viewMode === 'daily'
      ? `${visitsInPeriod} planned visit${visitsInPeriod === 1 ? '' : 's'} on this day`
      : viewMode === 'weekly'
        ? `${visitsInPeriod} planned visit${visitsInPeriod === 1 ? '' : 's'} this week`
        : `${visitsInPeriod} planned visit${visitsInPeriod === 1 ? '' : 's'} in ${periodLabel.toLowerCase()}`

  if (enabledSlots.length === 0) {
    return (
      <section className={cn('visit-plan-cal-root mar-cal-root', className)}>
        <div className="vp-cal-empty">
          <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden />
          <h3 className="mt-3 text-sm font-semibold text-foreground">Visit calendar</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Enable at least one call slot on the visit plan to preview scheduled visits on the calendar.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      className={cn(
        'mar-cal-root visit-plan-cal-root',
        viewMode === 'daily' && 'visit-plan-cal-daily',
        viewMode === 'weekly' && 'visit-plan-cal-weekly',
        className,
      )}
    >
      <article className="vp-cal-card">
        <header className="vp-cal-header">
          <div className="flex min-w-0 items-start gap-3">
            <div className="vp-cal-header-icon" aria-hidden>
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="vp-cal-title">Visit calendar</h3>
              <p className="vp-cal-subtitle">{periodSummary}</p>
            </div>
          </div>
          <div className="vp-cal-stats">
            <span className="vp-cal-stat">
              <CalendarDays className="h-3.5 w-3.5 text-teal-600" aria-hidden />
              <span className="vp-cal-stat-value">{visitsInPeriod}</span> visits
            </span>
            <span className="vp-cal-stat">
              <Users className="h-3.5 w-3.5 text-teal-600" aria-hidden />
              <span className="vp-cal-stat-value">{enabledSlots.length}</span> call slots
            </span>
          </div>
        </header>

        <div className="vp-cal-toolbar">
          <div className="vp-cal-toolbar-group">
            <div className="vp-cal-view-toggle" role="group" aria-label="Calendar view">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={cn('vp-cal-view-btn', viewMode === mode.id && 'active')}
                  onClick={() => setViewMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          <div className="vp-cal-toolbar-group">
            <div className="vp-cal-nav">
              <button
                type="button"
                className="vp-cal-nav-btn"
                aria-label={
                  viewMode === 'daily' ? 'Previous day' : viewMode === 'weekly' ? 'Previous week' : 'Previous month'
                }
                onClick={goPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="vp-cal-period" title={periodLabel}>
                {periodLabel}
              </span>
              <button
                type="button"
                className="vp-cal-nav-btn"
                aria-label={
                  viewMode === 'daily' ? 'Next day' : viewMode === 'weekly' ? 'Next week' : 'Next month'
                }
                onClick={goNext}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button type="button" className="vp-cal-today-btn" onClick={goToToday}>
              Today
            </button>
          </div>
        </div>

        <div className="vp-cal-legend">
          <div className="vp-cal-legend-items">
            {enabledSlots.map((slot) => (
              <span
                key={slot.slotCode}
                className={cn('vp-cal-legend-chip', SLOT_CHIP_CLASS[slot.slotCode])}
              >
                <span className={cn('vp-cal-legend-dot', SLOT_DOT_CLASS[slot.slotCode])} aria-hidden />
                {slot.label}
              </span>
            ))}
          </div>
          <p className="vp-cal-hint">Hover a visit cell for time and carer details</p>
        </div>

        <TooltipProvider delayDuration={150}>
          <div className="mar-wrapper overflow-x-auto">
            <table className="mar-table">
              <colgroup>
                <col className="mar-col-sticky" />
                <col className="mar-col-time" />
                {visibleDays.map((cell) => (
                  <col key={cell.iso} className="mar-col-day" />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="sticky-col">Call slot</th>
                  <th className="time-col">Time</th>
                  {visibleDays.map((cell) => {
                    const today = cell.iso === todayIso
                    const header = visitPlanDayHeaderLabel(cell)
                    return (
                      <th
                        key={cell.iso}
                        className={['day-header', today ? 'day-today-col' : ''].filter(Boolean).join(' ')}
                      >
                        <span className="day-header-num">{header.num}</span>
                        <span className="day-header-dow">{header.dow}</span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {enabledSlots.map((slot, rowIndex) => {
                  const start = normalizeTimeForInput(slot.plannedStartTime)
                  const end = normalizeTimeForInput(slot.plannedEndTime)
                  const carers = carerLabels(slot, employeeNameById)
                  return (
                    <React.Fragment key={slot.slotCode}>
                      {rowIndex > 0 ? (
                        <tr className="mar-med-gap" aria-hidden>
                          <td colSpan={visibleDays.length + 2} />
                        </tr>
                      ) : null}
                      <tr className={cn('vp-cal-row med-group-row mar-med-card-start', SLOT_ROW_CLASS[slot.slotCode])}>
                        <td className="sticky-col">
                          <p className="vp-cal-slot-name">{slot.label}</p>
                          <div className="vp-cal-slot-meta">
                            <User className="h-3 w-3 shrink-0" aria-hidden />
                            <span className="vp-cal-carer-line" title={carers.names.join(', ') || undefined}>
                              {carers.rowLabel}
                            </span>
                          </div>
                        </td>
                        <td className="time-col">
                          <span className="vp-cal-time-col">{start}</span>
                          <span className="vp-cal-time-end">– {end}</span>
                        </td>
                        {visibleDays.map((cell) => {
                          const anchor = anchorByMonth.get(cell.month)!
                          const matches = slotMatchesPlanDay(slot, cell.month, cell.day, anchor)
                          const today = cell.iso === todayIso
                          return (
                            <td
                              key={`${slot.slotCode}-${cell.iso}`}
                              className={cn(
                                'mar-cell',
                                !matches && 'is-not-scheduled',
                                today && matches && 'col-today',
                              )}
                            >
                              {matches ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        'vp-cal-visit',
                                        SLOT_CHIP_CLASS[slot.slotCode],
                                      )}
                                      tabIndex={0}
                                    >
                                      <span className="vp-cal-visit-time">{start}</span>
                                      <span className="vp-cal-visit-mark">{carers.cellMark}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    align="center"
                                    sideOffset={8}
                                    className="visit-plan-cal-tooltip z-[300] max-w-[280px] border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-lg"
                                  >
                                    <VisitCalendarCellTooltip
                                      slot={slot}
                                      month={cell.month}
                                      day={cell.day}
                                      start={start}
                                      end={end}
                                      carerNames={carers.names}
                                    />
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                            </td>
                          )
                        })}
                      </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </TooltipProvider>

        <footer className="vp-cal-footer">
          Preview from visit plan recurrence rules. Generate rota from an active plan to create scheduled visits
          in Scheduling.
        </footer>
      </article>
    </section>
  )
}
