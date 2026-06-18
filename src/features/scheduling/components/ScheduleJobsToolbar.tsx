import { Link } from '@tanstack/react-router'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { format } from 'date-fns'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutList,
  Loader2,
  RefreshCw,
  Route,
  Settings,
} from 'lucide-react'
import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import {
  SCHEDULE_JOBS_LAYOUT_META,
  type ScheduleJobsLayout,
} from '@/features/scheduling/utils/schedule-jobs-layout.util'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/date-picker'
import { Combobox } from '@/shared/ui/combobox'
import {
  formatHoursMinutes,
  formatScheduleJobsDayMonth,
  formatScheduleJobsWeekday,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { todayIso } from '@/features/scheduling/utils/scheduling-format'
import type { ScheduleJobOutcomeFilter } from '@/features/scheduling/utils/schedule-job-board-filter.util'
import {
  parseScheduleJobsRequiredCarersFilter,
  scheduleJobsRequiredCarersFilterLabel,
  type ScheduleJobsRequiredCarersFilter,
} from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import { jobBlockCompletedSurfaceStyle } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

type StatChipProps = {
  label: string
  value: string | number
  accent?: 'default' | 'sky' | 'emerald' | 'amber' | 'rose'
  title?: string
}

function StatChip({ label, value, accent = 'default', title }: StatChipProps) {
  return (
    <div
      title={title}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-xs',
        accent === 'sky' && 'border-sky-200/80 bg-sky-50/80 dark:border-sky-900 dark:bg-sky-950/40',
        accent === 'emerald' && 'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/40',
        accent === 'amber' && 'border-amber-200/80 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/40',
        accent === 'rose' && 'border-rose-200/80 bg-rose-50/80 dark:border-rose-900 dark:bg-rose-950/40',
        accent === 'default' && 'border-border/80 bg-muted/30',
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

type Props = {
  date: string
  locationId: string | null
  locations: Array<{ id: string; name: string }>
  onLocationChange: (locationId: string | null) => void
  serviceUserId: string | null
  serviceUsers: Array<{ id: string; label: string }>
  onServiceUserChange: (serviceUserId: string | null) => void
  requiredCarersFilter: ScheduleJobsRequiredCarersFilter
  requiredCarersOptions: Array<{ value: string; label: string; description?: string }>
  onRequiredCarersFilterChange: (filter: ScheduleJobsRequiredCarersFilter) => void
  onPrevDay: () => void
  onNextDay: () => void
  onToday: () => void
  onDateChange: (isoDate: string) => void
  onRefresh: () => void
  isLoading?: boolean
  hasError?: boolean
  requiredMinutes: number
  bookedMinutes: number
  overBookedMinutes?: number
  carersOnBoard: number
  carersWorking: number
  unassignedCount: number
  excessContractedCount?: number
  weeklyContractedMinutes?: number
  weeklyBookedVisitMinutes?: number
  weeklyExcessContractMinutes?: number
  jobOutcomeFilters: ReadonlySet<ScheduleJobOutcomeFilter>
  jobOutcomeCounts: Record<ScheduleJobOutcomeFilter, number>
  onToggleJobOutcomeFilter: (filter: ScheduleJobOutcomeFilter) => void
  operationalIssuesOnly?: boolean
  operationalIssuesCount?: number
  onToggleOperationalIssuesOnly?: () => void
  layout: ScheduleJobsLayout
  onLayoutChange: (layout: ScheduleJobsLayout) => void
}

const OUTCOME_FILTER_META: Array<{
  id: ScheduleJobOutcomeFilter
  label: string
  swatchClass?: string
  swatchStyle?: React.CSSProperties
}> = [
  {
    id: 'booked',
    label: 'Booked',
    swatchClass:
      'border border-emerald-600/70 bg-gradient-to-b from-emerald-100 to-emerald-200/90',
  },
  {
    id: 'not-available',
    label: 'Not available',
    swatchClass:
      'border border-rose-500/80 bg-gradient-to-b from-rose-50 to-rose-100',
  },
  {
    id: 'completed',
    label: 'Completed',
    swatchClass: 'border border-[#6ee7b7]',
    swatchStyle: jobBlockCompletedSurfaceStyle,
  },
]

function JobOutcomeFilterChip({
  id,
  label,
  count,
  active,
  swatchClass,
  swatchStyle,
  onToggle,
}: {
  id: ScheduleJobOutcomeFilter
  label: string
  count: number
  active: boolean
  swatchClass?: string
  swatchStyle?: React.CSSProperties
  onToggle: (id: ScheduleJobOutcomeFilter) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onToggle(id)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-foreground shadow-sm'
          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50',
      )}
    >
      <span
        className={cn('h-2.5 w-4 shrink-0 rounded-sm', swatchClass)}
        style={swatchStyle}
        aria-hidden
      />
      {label}
      <span className="tabular-nums opacity-80">({count})</span>
    </button>
  )
}

function isoDateToLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`)
}

function localDateToIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function ScheduleJobsToolbar({
  date,
  locationId,
  locations,
  onLocationChange,
  serviceUserId,
  serviceUsers,
  onServiceUserChange,
  requiredCarersFilter,
  requiredCarersOptions,
  onRequiredCarersFilterChange,
  onPrevDay,
  onNextDay,
  onToday,
  onDateChange,
  onRefresh,
  isLoading,
  hasError,
  requiredMinutes,
  bookedMinutes,
  overBookedMinutes = 0,
  carersOnBoard,
  carersWorking,
  unassignedCount,
  excessContractedCount = 0,
  weeklyContractedMinutes = 0,
  weeklyBookedVisitMinutes = 0,
  weeklyExcessContractMinutes = 0,
  jobOutcomeFilters,
  jobOutcomeCounts,
  onToggleJobOutcomeFilter,
  operationalIssuesOnly = false,
  operationalIssuesCount = 0,
  onToggleOperationalIssuesOnly,
  layout,
  onLayoutChange,
}: Props) {
  const isToday = date === todayIso()
  const layoutMeta = SCHEDULE_JOBS_LAYOUT_META[layout]
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const selectedDate = React.useMemo(() => isoDateToLocalDate(date), [date])
  const locationComboboxOptions = React.useMemo(
    () => [
      { value: '', label: 'All locations' },
      ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
    ],
    [locations],
  )
  const serviceUserComboboxOptions = React.useMemo(
    () => [
      { value: '', label: 'All service users' },
      ...serviceUsers.map((su) => ({ value: su.id, label: su.label })),
    ],
    [serviceUsers],
  )
  const filterComboboxClassName =
    'h-7 w-[min(14rem,42vw)] border-0 bg-transparent px-1 text-xs shadow-none'

  const activeLocationName = locationId
    ? locations.find((loc) => loc.id === locationId)?.name
    : null
  const activeServiceUserLabel = serviceUserId
    ? serviceUsers.find((su) => su.id === serviceUserId)?.label
    : null
  const hasActiveFilters =
    Boolean(activeLocationName) ||
    Boolean(activeServiceUserLabel) ||
    (layout === 'board' && requiredCarersFilter !== 'all')

  const accordionSummaryParts = [
    hasActiveFilters ? 'Filters active' : null,
    layout === 'board' && !isLoading && !hasError
      ? `Required ${formatHoursMinutes(requiredMinutes)} · Booked ${formatHoursMinutes(bookedMinutes)}`
      : null,
    layout === 'board' && !isLoading && !hasError && unassignedCount > 0
      ? `${unassignedCount} unassigned`
      : null,
  ].filter(Boolean)

  return (
    <div className="mb-3 shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-gradient-to-r from-card via-card to-muted/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5 shadow-sm">
            <Button type="button" size="icon-sm" variant="ghost" className="h-8 w-8" onClick={onPrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={isToday ? 'secondary' : 'ghost'}
              className="h-8 px-3 text-xs font-semibold"
              onClick={onToday}
            >
              Today
            </Button>
            <Button type="button" size="icon-sm" variant="ghost" className="h-8 w-8" onClick={onNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <PopoverPrimitive.Root open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverPrimitive.Trigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="h-8 w-8 rounded-none border-l border-border"
                  aria-label="Pick schedule date"
                >
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverPrimitive.Trigger>
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                  className="z-50 rounded-lg border border-border bg-popover shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                  align="start"
                  sideOffset={6}
                >
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(nextDate) => {
                      if (!nextDate) return
                      onDateChange(localDateToIsoDate(nextDate))
                      setCalendarOpen(false)
                    }}
                    autoFocus
                  />
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-center shadow-sm',
                isToday
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-muted/40 text-foreground',
              )}
            >
              <span className="text-[10px] font-bold uppercase leading-none tracking-wide">
                {formatScheduleJobsWeekday(date)}
              </span>
              <span className="mt-0.5 text-lg font-bold leading-none tabular-nums">
                {new Date(`${date}T12:00:00`).getDate()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{formatScheduleJobsDayMonth(date)}</p>
              <p className="text-xs text-muted-foreground">{layoutMeta.description}</p>
            </div>
          </div>

          <div className="flex items-center rounded-lg border border-border bg-background p-0.5 shadow-sm">
            <Button
              type="button"
              size="sm"
              variant={layout === 'board' ? 'secondary' : 'ghost'}
              className="h-8 gap-1.5 px-3 text-xs font-semibold"
              onClick={() => onLayoutChange('board')}
              aria-pressed={layout === 'board'}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Rota board
            </Button>
            <Button
              type="button"
              size="sm"
              variant={layout === 'runs' ? 'secondary' : 'ghost'}
              className="h-8 gap-1.5 px-3 text-xs font-semibold"
              onClick={() => onLayoutChange('runs')}
              aria-pressed={layout === 'runs'}
            >
              <Route className="h-3.5 w-3.5" />
              Runs
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={onRefresh}>
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>

          <Button type="button" size="icon-sm" variant="outline" className="h-8 w-8" asChild>
            <Link to="/scheduling/build" aria-label="Schedule settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>

          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" asChild>
            <Link to="/scheduling/list" search={{ date }}>
              <LayoutList className="h-3.5 w-3.5" />
              List
            </Link>
          </Button>
        </div>
      </div>

      {hasError ? (
        <p className="border-b border-border/80 px-4 py-2 text-sm text-destructive">
          Could not load schedule data. Try refresh.
        </p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 border-b border-border/80 px-4 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading schedule…
        </div>
      ) : null}

      <details className="group">
        <summary
          className={cn(
            'flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-muted/30',
            '[&::-webkit-details-marker]:hidden',
          )}
        >
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          <span className="font-medium text-foreground">Filters & summary</span>
          {accordionSummaryParts.length > 0 ? (
            <span className="truncate text-xs text-muted-foreground">{accordionSummaryParts.join(' · ')}</span>
          ) : null}
        </summary>

        <div className="space-y-3 border-t border-border/60 bg-muted/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Location</span>
              <div data-testid="schedule-jobs-location-filter">
                <Combobox
                  options={locationComboboxOptions}
                  value={locationId ?? ''}
                  onChange={(value) => onLocationChange(value || null)}
                  placeholder="All locations"
                  searchPlaceholder="Search locations…"
                  emptyText="No locations found."
                  disabled={locations.length === 0}
                  className={filterComboboxClassName}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Service user
              </span>
              <div data-testid="schedule-jobs-service-user-filter">
                <Combobox
                  options={serviceUserComboboxOptions}
                  value={serviceUserId ?? ''}
                  onChange={(value) => onServiceUserChange(value || null)}
                  placeholder="All service users"
                  searchPlaceholder="Search service users…"
                  emptyText="No service users on this day."
                  disabled={serviceUsers.length === 0}
                  className={filterComboboxClassName}
                />
              </div>
            </div>

            {layout === 'board' ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Carers required
                </span>
                <div data-testid="schedule-jobs-required-carers-filter">
                  <Combobox
                    options={requiredCarersOptions}
                    value={requiredCarersFilter === 'all' ? '' : requiredCarersFilter}
                    onChange={(value) =>
                      onRequiredCarersFilterChange(parseScheduleJobsRequiredCarersFilter(value || undefined))
                    }
                    placeholder="All visits"
                    searchPlaceholder="Filter by carers required…"
                    emptyText="No matching options."
                    className={filterComboboxClassName}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {layout === 'board' ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatChip
                  label="Required carer h"
                  value={formatHoursMinutes(requiredMinutes)}
                  title="Today only — sum of (visit duration × carers required) for all jobs on this day"
                />
                <StatChip
                  label="Booked"
                  value={formatHoursMinutes(bookedMinutes)}
                  accent={overBookedMinutes > 0 ? 'rose' : 'emerald'}
                  title="Today only — total carer-hours assigned on the rota for this day"
                />
                {overBookedMinutes > 0 ? (
                  <StatChip
                    label="Over booked"
                    value={formatHoursMinutes(overBookedMinutes)}
                    accent="rose"
                    title="Today's booked carer-hours exceed today's required carer-hours"
                  />
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {weeklyContractedMinutes > 0 ? (
                  <>
                    <StatChip
                      label="Weekly contract"
                      value={formatHoursMinutes(weeklyContractedMinutes)}
                      title="Sum of weekly contracted hours from visit plans (Mon–Sun)"
                    />
                    <StatChip
                      label="Booked this week"
                      value={formatHoursMinutes(weeklyBookedVisitMinutes)}
                      accent={weeklyExcessContractMinutes > 0 ? 'amber' : 'default'}
                      title="Visit hours scheduled this week (not carer-hours) — compared to weekly contract"
                    />
                  </>
                ) : null}
                {weeklyExcessContractMinutes > 0 ? (
                  <StatChip
                    label="Over weekly contract"
                    value={formatHoursMinutes(weeklyExcessContractMinutes)}
                    accent="amber"
                    title="Visit hours booked this week above the service user's weekly contracted hours"
                  />
                ) : null}
                <StatChip label="Carers on board" value={carersOnBoard} accent="sky" />
                <StatChip label="Working today" value={carersWorking} accent="sky" />
                {unassignedCount > 0 ? (
                  <StatChip label="Unassigned" value={unassignedCount} accent="amber" />
                ) : null}
                {excessContractedCount > 0 ? (
                  <StatChip
                    label="Over contract jobs today"
                    value={excessContractedCount}
                    accent="amber"
                    title="Jobs on this day that fall past the weekly contracted hour limit (amber stripes on Gantt)"
                  />
                ) : null}

                <div className="flex flex-wrap items-center gap-1.5 border-l border-border/80 pl-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Show jobs
                  </span>
                  {OUTCOME_FILTER_META.map((option) => (
                    <JobOutcomeFilterChip
                      key={option.id}
                      id={option.id}
                      label={option.label}
                      count={jobOutcomeCounts[option.id]}
                      active={jobOutcomeFilters.has(option.id)}
                      swatchClass={option.swatchClass}
                      swatchStyle={option.swatchStyle}
                      onToggle={onToggleJobOutcomeFilter}
                    />
                  ))}
                  {onToggleOperationalIssuesOnly ? (
                    <button
                      type="button"
                      aria-pressed={operationalIssuesOnly}
                      onClick={onToggleOperationalIssuesOnly}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        operationalIssuesOnly
                          ? 'border-amber-500/50 bg-amber-50 text-amber-900 shadow-sm dark:bg-amber-950/40 dark:text-amber-100'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50',
                      )}
                    >
                      Issues only
                      <span className="tabular-nums opacity-80">({operationalIssuesCount})</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create runs, add visits, and set visit order for {formatScheduleJobsDayMonth(date)}.
            </p>
          )}

          {hasActiveFilters ? (
            <p className="text-xs text-muted-foreground">
              {activeLocationName ? (
                <>
                  Location: <span className="font-medium text-foreground">{activeLocationName}</span>
                  {activeServiceUserLabel || (layout === 'board' && requiredCarersFilter !== 'all') ? ' · ' : ''}
                </>
              ) : null}
              {activeServiceUserLabel ? (
                <>
                  Service user: <span className="font-medium text-foreground">{activeServiceUserLabel}</span>
                  {layout === 'board' && requiredCarersFilter !== 'all' ? ' · ' : ''}
                </>
              ) : null}
              {layout === 'board' && requiredCarersFilter !== 'all' ? (
                <>
                  Carers required:{' '}
                  <span className="font-medium text-foreground">
                    {scheduleJobsRequiredCarersFilterLabel(requiredCarersFilter)}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </details>
    </div>
  )
}
