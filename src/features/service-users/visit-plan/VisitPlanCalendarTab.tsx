import * as React from 'react'
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import {
  currentMedicationChartMonth,
  formatChartMonthLabel,
  shiftMedicationChartMonth,
} from '@/features/service-users/hooks/useMedicationMarChart'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import { normalizeTimeForInput } from '@/features/service-users/visit-plan/visit-plan-time.util'
import {
  slotMatchesPlanDay,
  visitPlanCalendarAnchor,
  visitPlanDayDate,
  visitPlanDayOfWeekLetter,
  visitPlanLastDayOfMonth,
  visitPlanTodayDayInMonth,
} from '@/features/service-users/visit-plan/visit-plan-schedule-match.util'
import { VISIT_PLAN_DAY_LABELS, type ServiceUserVisitPlan, type VisitPlanSlot, type VisitPlanSlotCode } from '@/features/service-users/visit-plan/types'
import '@/features/service-users/medication/mar-calendar.css'
import '@/features/service-users/visit-plan/visit-plan-calendar.css'

const SLOT_CHIP_CLASS: Record<VisitPlanSlotCode, string> = {
  MORNING: 'bg-amber-100 text-amber-950 border-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-800',
  LUNCH: 'bg-orange-100 text-orange-950 border-orange-200 dark:bg-orange-950/50 dark:text-orange-100 dark:border-orange-800',
  TEA: 'bg-sky-100 text-sky-950 border-sky-200 dark:bg-sky-950/50 dark:text-sky-100 dark:border-sky-800',
  EVENING: 'bg-indigo-100 text-indigo-950 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-100 dark:border-indigo-800',
  NIGHT: 'bg-violet-100 text-violet-950 border-violet-200 dark:bg-violet-950/50 dark:text-violet-100 dark:border-violet-800',
}

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
  const shortFirst = first.length > 18 ? `${first.slice(0, 16)}…` : first
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
    <div className="space-y-2 text-left">
      <div>
        <p className="font-semibold text-foreground">{slot.label}</p>
        <p className="text-muted-foreground">{formatCalendarDateLabel(month, day)}</p>
      </div>
      <dl className="space-y-1.5 text-xs">
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <dt className="sr-only">Visit time</dt>
            <dd className="font-medium text-foreground">
              {start} – {end}
            </dd>
            {slot.durationMinutes ? (
              <dd className="text-muted-foreground">Duration: {slot.durationMinutes} min</dd>
            ) : null}
            {slot.timeCritical ? (
              <dd className="text-muted-foreground">
                Time critical ({slot.timeToleranceMinutes} min tolerance)
              </dd>
            ) : null}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <dt className="font-medium text-foreground">
              {slot.requiredCarers} carer{slot.requiredCarers === 1 ? '' : 's'} required
            </dt>
            <dd className="mt-0.5 text-muted-foreground">
              {carerNames.length === 0 ? (
                'No carers assigned'
              ) : (
                <ul className="space-y-0.5">
                  {carerNames.map((name) => (
                    <li key={name}>{name}</li>
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
  const [month, setMonth] = React.useState(currentMedicationChartMonth)

  const enabledSlots = React.useMemo(
    () => [...(plan.slots ?? [])].filter((s) => s.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [plan.slots],
  )

  const anchor = React.useMemo(
    () => visitPlanCalendarAnchor(plan.effectiveFrom, month),
    [plan.effectiveFrom, month],
  )

  const lastDay = visitPlanLastDayOfMonth(month)
  const visibleDays = React.useMemo(
    () => Array.from({ length: lastDay }, (_, i) => i + 1),
    [lastDay],
  )
  const todayDay = visitPlanTodayDayInMonth(month)
  const monthLabel = formatChartMonthLabel(month)

  const visitsInMonth = React.useMemo(() => {
    let count = 0
    for (const slot of enabledSlots) {
      for (const day of visibleDays) {
        if (slotMatchesPlanDay(slot, month, day, anchor)) count++
      }
    }
    return count
  }, [enabledSlots, visibleDays, month, anchor])

  const goToToday = () => setMonth(currentMedicationChartMonth())

  if (enabledSlots.length === 0) {
    return (
      <section className={cn('rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center', className)}>
        <h3 className="text-sm font-semibold text-foreground">Visit calendar</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Enable at least one call slot on the visit plan to preview scheduled visits on the calendar.
        </p>
      </section>
    )
  }

  return (
    <section className={cn('mar-cal-root visit-plan-cal-root space-y-4', className)}>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Visit calendar</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Planned visits from this care package — {visitsInMonth} visit{visitsInMonth === 1 ? '' : 's'} in{' '}
              {monthLabel.toLowerCase()}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="month-nav">
              <button
                type="button"
                className="month-btn"
                aria-label="Previous month"
                onClick={() => setMonth((m) => shiftMedicationChartMonth(m, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="month-label">{monthLabel}</span>
              <button
                type="button"
                className="month-btn"
                aria-label="Next month"
                onClick={() => setMonth((m) => shiftMedicationChartMonth(m, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button type="button" className="filter-expand-btn" onClick={goToToday}>
              Go to today
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap gap-2">
            {enabledSlots.map((slot) => (
              <span
                key={slot.slotCode}
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                  SLOT_CHIP_CLASS[slot.slotCode],
                )}
              >
                {slot.label}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Day cells show start time and carer count. Hover a cell for visit and carer details.
          </p>
        </div>
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="mar-wrapper overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="mar-table">
          <colgroup>
            <col className="mar-col-sticky" />
            <col className="mar-col-time" />
            {visibleDays.map((d) => (
              <col key={`col-${d}`} className="mar-col-day" />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky-col">Call slot</th>
              <th className="time-col">Time</th>
              {visibleDays.map((d) => {
                const today = d === todayDay
                return (
                  <th
                    key={`day-${d}`}
                    className={['day-header', today ? 'day-today-col' : ''].filter(Boolean).join(' ')}
                  >
                    <span className="day-header-num">{d}</span>
                    <span className="day-header-dow">{visitPlanDayOfWeekLetter(month, d)}</span>
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
                  <tr className="med-group-row mar-med-card-start">
                    <td className="sticky-col">
                      <p className="vp-cal-slot-name">{slot.label}</p>
                      <p className="vp-cal-carer-line" title={carers.names.join(', ') || undefined}>
                        {carers.rowLabel}
                      </p>
                    </td>
                    <td className="time-col">
                      <span className="vp-cal-time-col">{start}</span>
                      <span className="vp-cal-time-end">– {end}</span>
                    </td>
                    {visibleDays.map((d) => {
                      const matches = slotMatchesPlanDay(slot, month, d, anchor)
                      const today = d === todayDay
                      return (
                        <td
                          key={`${slot.slotCode}-${d}`}
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
                                  className={cn('vp-cal-visit vp-cal-visit-hover', SLOT_CHIP_CLASS[slot.slotCode])}
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
                                className="visit-plan-cal-tooltip z-[300] max-w-[260px] border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-lg"
                              >
                                <VisitCalendarCellTooltip
                                  slot={slot}
                                  month={month}
                                  day={d}
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

      <p className="text-xs text-muted-foreground">
        Calendar reflects recurrence rules from the visit plan. Generate rota from an active plan to create
        scheduled visits in Scheduling.
      </p>
    </section>
  )
}
