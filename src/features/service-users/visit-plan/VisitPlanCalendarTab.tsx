import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, LayoutList, Table2, User, Users } from 'lucide-react'
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
} from '@/features/service-users/visit-plan/types'
import {
  fetchVisitPlanCalendarVisits,
  type VisitPlanCalendarVisit,
} from '@/features/service-users/visit-plan/api'
import {
  VisitPlanCalendarOutcomeDialog,
  type VisitPlanCalendarSelection,
} from '@/features/service-users/visit-plan/VisitPlanCalendarOutcomeDialog'
import {
  VISIT_PLAN_CALENDAR_OUTCOME_LEGEND,
  visitPlanCalendarOutcomeMeta,
} from '@/features/service-users/visit-plan/visit-plan-calendar-outcome.constants'
import { visitPlanCalendarSlotPresentation } from '@/features/service-users/visit-plan/visit-plan-calendar-overdue.util'
import {
  resolveVisitPlanCalendarCarerAllocation,
  visitPlanCalendarEffectiveOutcomeStatus,
} from '@/features/service-users/visit-plan/visit-plan-calendar-carer-allocation.util'
import { TimeCriticalDot } from '@/features/service-users/visit-plan/TimeCriticalDot'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import '@/features/service-users/medication/mar-calendar.css'
import '@/features/service-users/visit-plan/visit-plan-calendar.css'

const SLOT_ROW_CLASSES = [
  'vp-slot-morning',
  'vp-slot-lunch',
  'vp-slot-tea',
  'vp-slot-evening',
  'vp-slot-night',
] as const

const SLOT_CHIP_CLASSES = [
  'vp-chip-morning',
  'vp-chip-lunch',
  'vp-chip-tea',
  'vp-chip-evening',
  'vp-chip-night',
] as const

const SLOT_DOT_CLASSES = [
  'bg-amber-500',
  'bg-orange-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-violet-500',
] as const

function slotPaletteIndex(index: number): number {
  return index % SLOT_ROW_CLASSES.length
}

const VIEW_MODES: { id: VisitPlanCalendarViewMode; label: string }[] = [
  { id: 'daily', label: 'Day' },
  { id: 'weekly', label: 'Week' },
  { id: 'monthly', label: 'Month' },
]

type VisitPlanCalendarDisplayMode = 'calendar' | 'list'

const DISPLAY_MODES: { id: VisitPlanCalendarDisplayMode; label: string; icon: typeof Table2 }[] = [
  { id: 'calendar', label: 'Calendar', icon: Table2 },
  { id: 'list', label: 'List', icon: LayoutList },
]

type VisitListEntry = {
  iso: string
  month: string
  day: number
  slot: VisitPlanSlot
  start: string
  end: string
  carerNames: string[]
}

function buildVisitList(
  enabledSlots: VisitPlanSlot[],
  visibleDays: ReturnType<typeof visitPlanVisibleDayCells>,
  anchorByMonth: Map<string, Date>,
  employeeNameById: Map<string, string>,
): VisitListEntry[] {
  const entries: VisitListEntry[] = []
  for (const cell of visibleDays) {
    const anchor = anchorByMonth.get(cell.month)!
    for (const slot of enabledSlots) {
      if (!slotMatchesPlanDay(slot, cell.month, cell.day, anchor)) continue
      const carers = carerLabels(slot, employeeNameById)
      entries.push({
        iso: cell.iso,
        month: cell.month,
        day: cell.day,
        slot,
        start: normalizeTimeForInput(slot.plannedStartTime),
        end: normalizeTimeForInput(slot.plannedEndTime),
        carerNames: carers.names,
      })
    }
  }
  return entries.sort((a, b) => {
    if (a.iso !== b.iso) return a.iso.localeCompare(b.iso)
    return a.slot.sortOrder - b.slot.sortOrder
  })
}

function groupVisitListByDate(entries: VisitListEntry[]): Map<string, VisitListEntry[]> {
  const groups = new Map<string, VisitListEntry[]>()
  for (const entry of entries) {
    const list = groups.get(entry.iso) ?? []
    list.push(entry)
    groups.set(entry.iso, list)
  }
  return groups
}

type Props = {
  plan: ServiceUserVisitPlan
  serviceUserId: string
  employeeNameById: Map<string, string>
  acceptedCarePlans?: AcceptedCarePlanItem[]
  className?: string
}

function outcomeKey(visitPlanSlotId: string | undefined, iso: string): string | null {
  if (!visitPlanSlotId) return null
  return `${visitPlanSlotId}:${iso}`
}

function carerNamesForCell(
  slot: VisitPlanSlot,
  outcome: VisitPlanCalendarVisit | null | undefined,
  employeeNameById: Map<string, string>,
): string[] {
  const allocatedIds = outcome?.allocatedEmployeeIds ?? []
  if (allocatedIds.length > 0) {
    return allocatedIds.map((id) => resolveEmployeeDisplayName(employeeNameById, id))
  }
  return carerLabels(slot, employeeNameById).names
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
  outcomeStatus,
  isOverdue,
  outcomeNotes,
  carersRequired,
  carersAllocated,
  understaffed,
}: {
  slot: VisitPlanSlot
  month: string
  day: number
  start: string
  end: string
  carerNames: string[]
  outcomeStatus: string
  isOverdue?: boolean
  outcomeNotes?: string | null
  carersRequired: number
  carersAllocated: number
  understaffed: boolean
}) {
  const outcome = visitPlanCalendarOutcomeMeta(outcomeStatus)
  return (
    <div className="space-y-2.5 text-left">
      <div className="border-b border-border/60 pb-2">
        <p className="font-semibold text-foreground">{slot.label}</p>
        <p className="mt-1 text-xs font-medium">
          {isOverdue ? 'Overdue — no action recorded' : outcome.label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{formatCalendarDateLabel(month, day)}</p>
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
              {carerNames.length > 0
                ? `Carer Assigned : ${carerNames.length}`
                : `${carersRequired} carer${carersRequired === 1 ? '' : 's'} required`}
            </dt>
            <dd className="mt-1 text-muted-foreground">
              {outcomeStatus === 'NOT_GENERATED' ? (
                carerNames.length > 0 ? (
                  <ul className="space-y-0.5">
                    {carerNames.map((name) => (
                      <li key={name} className="font-medium text-foreground">
                        {name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  'Generate rota from Configure to create this visit on the schedule'
                )
              ) : carerNames.length === 0 ? (
                'No carers assigned on rota'
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
            {understaffed && outcomeStatus !== 'NOT_GENERATED' ? (
              <dd className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                Needs attention: {carersAllocated}/{carersRequired} carers allocated
              </dd>
            ) : null}
          </div>
        </div>
        {outcomeNotes?.trim() ? (
          <div className="rounded-md bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Notes</p>
            <p className="mt-1 whitespace-pre-wrap">{outcomeNotes.trim()}</p>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

export function VisitPlanCalendarTab({
  plan,
  serviceUserId,
  employeeNameById,
  acceptedCarePlans = [],
  className,
}: Props) {
  const [displayMode, setDisplayMode] = React.useState<VisitPlanCalendarDisplayMode>('calendar')
  const [viewMode, setViewMode] = React.useState<VisitPlanCalendarViewMode>('monthly')
  const [focusIso, setFocusIso] = React.useState(visitPlanTodayIsoDate)
  const [outcomeDialogOpen, setOutcomeDialogOpen] = React.useState(false)
  const [selectedVisit, setSelectedVisit] = React.useState<VisitPlanCalendarSelection | null>(null)
  const [outcomeOverrides, setOutcomeOverrides] = React.useState<Map<string, VisitPlanCalendarVisit>>(
    () => new Map(),
  )

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

  const outcomeRange = React.useMemo(() => {
    if (!visibleDays.length) return null
    const sorted = [...visibleDays].sort((a, b) => a.iso.localeCompare(b.iso))
    return { from: sorted[0]!.iso, to: sorted[sorted.length - 1]!.iso }
  }, [visibleDays])

  const outcomesQuery = useQuery({
    queryKey: ['visit-plan-calendar-visits', serviceUserId, plan.id, outcomeRange?.from, outcomeRange?.to],
    queryFn: () => fetchVisitPlanCalendarVisits(serviceUserId, plan.id, outcomeRange!),
    enabled: Boolean(serviceUserId && plan.id && outcomeRange),
  })

  const outcomeByKey = React.useMemo(() => {
    const map = new Map<string, VisitPlanCalendarVisit>()
    for (const row of outcomesQuery.data ?? []) {
      const key = outcomeKey(row.visitPlanSlotId ?? undefined, row.occurrenceDate)
      if (key) map.set(key, row)
    }
    for (const [key, row] of outcomeOverrides) map.set(key, row)
    return map
  }, [outcomesQuery.data, outcomeOverrides])

  const allocatedEmployeeIds = React.useMemo(() => {
    const ids = new Set<string>()
    for (const visit of outcomesQuery.data ?? []) {
      for (const id of visit.allocatedEmployeeIds ?? []) {
        if (id.trim()) ids.add(id)
      }
    }
    for (const row of outcomeOverrides.values()) {
      for (const id of row.allocatedEmployeeIds ?? []) {
        if (id.trim()) ids.add(id)
      }
    }
    return [...ids]
  }, [outcomesQuery.data, outcomeOverrides])

  const allocatedEmployeeNameById = useEmployeeNameMap(allocatedEmployeeIds)
  const combinedEmployeeNameById = React.useMemo(() => {
    const map = new Map(employeeNameById)
    for (const [id, name] of allocatedEmployeeNameById) map.set(id, name)
    return map
  }, [employeeNameById, allocatedEmployeeNameById])

  const visitList = React.useMemo(
    () => buildVisitList(enabledSlots, visibleDays, anchorByMonth, combinedEmployeeNameById),
    [enabledSlots, visibleDays, anchorByMonth, combinedEmployeeNameById],
  )

  const visitListByDate = React.useMemo(() => groupVisitListByDate(visitList), [visitList])

  const generatedInPeriod = React.useMemo(() => {
    let count = 0
    for (const slot of enabledSlots) {
      for (const cell of visibleDays) {
        const anchor = anchorByMonth.get(cell.month)!
        if (!slotMatchesPlanDay(slot, cell.month, cell.day, anchor)) continue
        const key = outcomeKey(slot.id, cell.iso)
        if (key && outcomeByKey.has(key)) count++
      }
    }
    return count
  }, [enabledSlots, visibleDays, anchorByMonth, outcomeByKey])

  const openOutcomeDialog = (selection: VisitPlanCalendarSelection) => {
    setSelectedVisit(selection)
    setOutcomeDialogOpen(true)
  }

  const selectedOutcome = React.useMemo(() => {
    if (!selectedVisit?.slot.id) return null
    const key = outcomeKey(selectedVisit.slot.id, selectedVisit.iso)
    return key ? outcomeByKey.get(key) ?? null : null
  }, [selectedVisit, outcomeByKey])

  const periodSummary =
    viewMode === 'daily'
      ? `${visitsInPeriod} planned · ${generatedInPeriod} on rota`
      : viewMode === 'weekly'
        ? `${visitsInPeriod} planned · ${generatedInPeriod} on rota this week`
        : `${visitsInPeriod} planned · ${generatedInPeriod} on rota in ${periodLabel.toLowerCase()}`

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
              <h3 className="vp-cal-title">
                {displayMode === 'list' ? 'Visit list' : 'Visit calendar'}
              </h3>
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
            <div className="vp-cal-view-toggle" role="group" aria-label="Display mode">
              {DISPLAY_MODES.map((mode) => {
                const Icon = mode.icon
                return (
                  <button
                    key={mode.id}
                    type="button"
                    className={cn('vp-cal-view-btn vp-cal-display-btn', displayMode === mode.id && 'active')}
                    onClick={() => setDisplayMode(mode.id)}
                  >
                    <Icon className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
                    {mode.label}
                  </button>
                )
              })}
            </div>
            <div className="vp-cal-view-toggle" role="group" aria-label="Period">
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
            {enabledSlots.map((slot, index) => (
              <span
                key={slot.slotCode}
                className={cn('vp-cal-legend-chip', SLOT_CHIP_CLASSES[slotPaletteIndex(index)])}
              >
                <span className={cn('vp-cal-legend-dot', SLOT_DOT_CLASSES[slotPaletteIndex(index)])} aria-hidden />
                {slot.label}
                {slot.timeCritical ? (
                  <TimeCriticalDot
                    toleranceMinutes={slot.timeToleranceMinutes}
                    size="xs"
                    className="ml-1 align-middle"
                  />
                ) : null}
              </span>
            ))}
          </div>
          <div className="vp-cal-legend-items vp-cal-outcome-legend">
            {VISIT_PLAN_CALENDAR_OUTCOME_LEGEND.map((status) => {
              const meta = visitPlanCalendarOutcomeMeta(status)
              return (
                <span key={status} className="vp-cal-legend-outcome-item">
                  <span className={cn('vp-cal-outcome-swatch', meta.className)} aria-hidden />
                  {meta.shortLabel}
                </span>
              )
            })}
            <span className="vp-cal-legend-outcome-item">
              <span className="vp-cal-outcome-swatch vp-cal-visit-overdue" aria-hidden />
              Overdue
            </span>
            <span className="vp-cal-legend-outcome-item">
              <TimeCriticalDot size="xs" toleranceMinutes={15} />
              Time critical
            </span>
          </div>
          <p className="vp-cal-hint">
            {displayMode === 'list'
              ? 'Click any planned visit to view details, carers, times, and record outcomes.'
              : 'Click any planned visit cell to open visit details. Striped cells are not yet on rota — you can still record an outcome to create them.'}
          </p>
        </div>

        {displayMode === 'list' ? (
          <div className="vp-cal-list">
            {visitList.length === 0 ? (
              <div className="vp-cal-list-empty">
                <LayoutList className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
                <p className="mt-2 text-sm text-muted-foreground">No visits planned in this period.</p>
              </div>
            ) : (
              <ul className="vp-cal-list-groups">
                {[...visitListByDate.entries()].map(([iso, dayEntries]) => (
                  <li key={iso} className="vp-cal-list-group">
                    <h4 className="vp-cal-list-date">{formatCalendarDateLabel(dayEntries[0]!.month, dayEntries[0]!.day)}</h4>
                    <ul className="vp-cal-list-items">
                      {dayEntries.map((entry) => {
                        const key = outcomeKey(entry.slot.id, entry.iso)
                        const outcome = key ? outcomeByKey.get(key) : null
                        const cellCarerNames = carerNamesForCell(entry.slot, outcome ?? undefined, combinedEmployeeNameById)
                        const allocation = resolveVisitPlanCalendarCarerAllocation({
                          outcome,
                          slot: entry.slot,
                          carerNames: cellCarerNames,
                        })
                        const effectiveStatus = visitPlanCalendarEffectiveOutcomeStatus({
                          outcome,
                          slot: entry.slot,
                          carerNames: cellCarerNames,
                        })
                        const presentation = visitPlanCalendarSlotPresentation({
                          occurrenceIso: entry.iso,
                          plannedEndTime: entry.end,
                          outcome: outcome ? { ...outcome, displayStatus: effectiveStatus } : outcome,
                        })
                        const outcomeMeta = visitPlanCalendarOutcomeMeta(presentation.outcomeStatus)
                        return (
                          <li key={`${entry.iso}-${entry.slot.slotCode}`}>
                            <button
                              type="button"
                              className={cn(
                                'vp-cal-list-item w-full text-left',
                                outcomeMeta.className,
                                presentation.isOverdue && 'vp-cal-visit-overdue',
                              )}
                              aria-label={`${entry.slot.label} ${formatCalendarDateLabel(entry.month, entry.day)} — ${presentation.isOverdue ? 'Overdue' : outcomeMeta.label}`}
                              onClick={() =>
                                openOutcomeDialog({
                                  iso: entry.iso,
                                  month: entry.month,
                                  day: entry.day,
                                  slot: entry.slot,
                                  start: entry.start,
                                  end: entry.end,
                                  carerNames: cellCarerNames,
                                })
                              }
                            >
                              <div className="vp-cal-list-item-main">
                                <div className="min-w-0">
                                  <p className="vp-cal-list-slot flex items-center gap-1.5">
                                    {entry.slot.timeCritical ? (
                                      <TimeCriticalDot
                                        toleranceMinutes={entry.slot.timeToleranceMinutes}
                                        size="xs"
                                      />
                                    ) : null}
                                    {entry.slot.label}
                                  </p>
                                  <p className="vp-cal-list-status">
                                    {presentation.isOverdue ? presentation.shortLabel : outcomeMeta.label}
                                  </p>
                                  <p className="vp-cal-list-time">
                                    <Clock className="inline h-3.5 w-3.5 shrink-0" aria-hidden />
                                    {entry.start} – {entry.end}
                                    {entry.slot.durationMinutes ? ` · ${entry.slot.durationMinutes} min` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="vp-cal-list-item-meta">
                                <span className="vp-cal-list-carers">
                                  <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {cellCarerNames.length === 0
                                    ? presentation.outcomeStatus === 'NOT_GENERATED'
                                      ? 'Not on rota'
                                      : 'Unassigned'
                                    : cellCarerNames.join(', ')}
                                </span>
                                <span className="vp-cal-list-required">
                                  {entry.slot.requiredCarers} required
                                </span>
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
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
                  const carers = carerLabels(slot, combinedEmployeeNameById)
                  return (
                    <React.Fragment key={slot.slotCode}>
                      {rowIndex > 0 ? (
                        <tr className="mar-med-gap" aria-hidden>
                          <td colSpan={visibleDays.length + 2} />
                        </tr>
                      ) : null}
                      <tr className={cn('vp-cal-row med-group-row mar-med-card-start', SLOT_ROW_CLASSES[slotPaletteIndex(rowIndex)])}>
                        <td className="sticky-col">
                          <p className="vp-cal-slot-name flex items-center gap-1.5">
                            {slot.timeCritical ? (
                              <TimeCriticalDot toleranceMinutes={slot.timeToleranceMinutes} size="xs" />
                            ) : null}
                            {slot.label}
                          </p>
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
                          const key = outcomeKey(slot.id, cell.iso)
                          const outcome = key ? outcomeByKey.get(key) : null
                          const cellCarerNames = carerNamesForCell(slot, outcome ?? undefined, combinedEmployeeNameById)
                          const allocation = resolveVisitPlanCalendarCarerAllocation({
                            outcome,
                            slot,
                            carerNames: cellCarerNames,
                          })
                          const effectiveStatus = visitPlanCalendarEffectiveOutcomeStatus({
                            outcome,
                            slot,
                            carerNames: cellCarerNames,
                          })
                          const presentation = visitPlanCalendarSlotPresentation({
                            occurrenceIso: cell.iso,
                            plannedEndTime: end,
                            outcome: outcome ? { ...outcome, displayStatus: effectiveStatus } : outcome,
                          })
                          const outcomeMeta = visitPlanCalendarOutcomeMeta(presentation.outcomeStatus)
                          return (
                            <td
                              key={`${slot.slotCode}-${cell.iso}`}
                              className={cn(
                                'mar-cell',
                                !matches && 'is-not-scheduled',
                                today && matches && 'col-today',
                                presentation.isOverdue && matches && 'col-overdue',
                              )}
                            >
                              {matches ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className={cn(
                                        'vp-cal-visit relative',
                                        outcomeMeta.className,
                                        presentation.isOverdue && 'vp-cal-visit-overdue',
                                      )}
                                      aria-label={`${slot.label} ${formatCalendarDateLabel(cell.month, cell.day)} — ${slot.timeCritical ? 'Time critical. ' : ''}${presentation.isOverdue ? 'Overdue — no action recorded' : outcomeMeta.label}`}
                                      onClick={() =>
                                        openOutcomeDialog({
                                          iso: cell.iso,
                                          month: cell.month,
                                          day: cell.day,
                                          slot,
                                          start,
                                          end,
                                          carerNames: cellCarerNames,
                                        })
                                      }
                                    >
                                      {slot.timeCritical ? (
                                        <TimeCriticalDot
                                          toleranceMinutes={slot.timeToleranceMinutes}
                                          position="corner"
                                          size="xs"
                                        />
                                      ) : null}
                                      <span className="vp-cal-visit-time">{start}</span>
                                      <span className="vp-cal-visit-label">{presentation.shortLabel}</span>
                                    </button>
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
                                      carerNames={cellCarerNames}
                                      outcomeStatus={presentation.outcomeStatus}
                                      isOverdue={presentation.isOverdue}
                                      outcomeNotes={outcome?.notes}
                                      carersRequired={allocation.carersRequired}
                                      carersAllocated={allocation.carersAllocated}
                                      understaffed={allocation.understaffed}
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
        )}

        <footer className="vp-cal-footer">
          Generated visits reflect the scheduling rota. Record carer outcomes after visits occur. Striped cells are
          planned from the visit plan but not yet generated — use Generate rota on Configure.
        </footer>
      </article>

      <VisitPlanCalendarOutcomeDialog
        open={outcomeDialogOpen}
        onOpenChange={setOutcomeDialogOpen}
        serviceUserId={serviceUserId}
        planId={plan.id}
        selection={selectedVisit}
        existing={selectedOutcome}
        acceptedCarePlans={acceptedCarePlans}
        employeeNameById={combinedEmployeeNameById}
        onSaved={(visit) => {
          const key = outcomeKey(visit.visitPlanSlotId ?? undefined, visit.occurrenceDate)
          if (!key) return
          setOutcomeOverrides((prev) => {
            const next = new Map(prev)
            next.set(key, visit)
            return next
          })
        }}
      />
    </section>
  )
}
