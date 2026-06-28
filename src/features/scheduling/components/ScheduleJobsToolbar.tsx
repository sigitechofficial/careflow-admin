import { Link } from '@tanstack/react-router'
import {
  CalendarDays,
  ChevronDown,
  LayoutList,
  Loader2,
  RefreshCw,
  Route,
  UserRound,
  Users,
} from 'lucide-react'
import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import {
  type ScheduleJobsLayout,
} from '@/features/scheduling/utils/schedule-jobs-layout.util'
import {
  type ScheduleJobsBoardRowAxis,
} from '@/features/scheduling/utils/schedule-jobs-board-axis.util'
import { Button } from '@/shared/ui/button'
import { MultiSelect } from '@/shared/ui/multi-select'
import {
  formatHoursMinutes,
  jobBlockCompletedSurfaceStyle,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { useScheduleJobsDisplayFormat } from '@/features/scheduling/context/schedule-jobs-display-format.context'
import type { ScheduleJobOutcomeFilter } from '@/features/scheduling/utils/schedule-job-board-filter.util'
import {
  SCHEDULE_CARER_OPERATIONAL_FILTERS,
  SCHEDULE_JOB_OPERATIONAL_FILTERS,
  scheduleCarerOperationalFilterLabel,
  scheduleJobOperationalFilterLabel,
  type ScheduleCarerOperationalFilter,
  type ScheduleJobOperationalFilter,
} from '@/features/scheduling/utils/schedule-job-board-filter.util'
import {
  scheduleJobsRequiredCarersFiltersLabel,
  type ScheduleJobsRequiredCarersFilterValue,
} from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import {
  isScheduleJobsFilterAllOptionSelected,
  normalizeScheduleJobsFilterChange,
  SCHEDULE_JOBS_FILTER_ALL_VALUE,
  withScheduleJobsFilterAllOption,
} from '@/features/scheduling/utils/schedule-jobs-multi-filter.util'
import {
  ROTA_GAP_DISPLAY_MODES,
  rotaGapDisplayModeLabel,
  type RotaGapDisplayMode,
} from '@/features/scheduling/utils/schedule-job-rota-gap.util'

const SCHEDULE_JOBS_TOGGLE_SELECTED_CLASS =
  'bg-emerald-100 text-emerald-900 shadow-sm ring-1 ring-inset ring-emerald-300/70 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-700'

function scheduleJobsToolbarToggleClass(selected: boolean, className?: string) {
  return cn(className, selected && SCHEDULE_JOBS_TOGGLE_SELECTED_CLASS)
}

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
  locationIds: string[]
  branchFilterOptions: Array<{ id: string; label: string; displayLabel: string }>
  allBranchesLabel: string
  onLocationChange: (locationIds: string[]) => void
  serviceUserIds: string[]
  serviceUsers: Array<{ id: string; label: string }>
  allServiceUsersLabel: string
  onServiceUserChange: (serviceUserIds: string[]) => void
  requiredCarersFilters: ScheduleJobsRequiredCarersFilterValue[]
  requiredCarersOptions: Array<{ value: string; label: string; description?: string }>
  onRequiredCarersFiltersChange: (filters: ScheduleJobsRequiredCarersFilterValue[]) => void
  allVisitsLabel: string
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
  jobOperationalFilters?: ScheduleJobOperationalFilter[]
  jobOperationalCounts?: Record<ScheduleJobOperationalFilter, number>
  onToggleJobOperationalFilter?: (filter: ScheduleJobOperationalFilter) => void
  carerOperationalFilters?: ScheduleCarerOperationalFilter[]
  carerOnLeaveTodayCount?: number
  onToggleCarerOperationalFilter?: (filter: ScheduleCarerOperationalFilter) => void
  operationalIssuesCount?: number
  layout: ScheduleJobsLayout
  onLayoutChange: (layout: ScheduleJobsLayout) => void
  rowAxis: ScheduleJobsBoardRowAxis
  onRowAxisChange: (rowAxis: ScheduleJobsBoardRowAxis) => void
  showRunsOnBoard?: boolean
  onShowRunsOnBoardChange?: (show: boolean) => void
  rotaGapDisplay?: RotaGapDisplayMode
  onRotaGapDisplayChange?: (mode: RotaGapDisplayMode) => void
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

export function ScheduleJobsToolbar({
  date,
  locationIds,
  branchFilterOptions,
  allBranchesLabel,
  onLocationChange,
  serviceUserIds,
  serviceUsers,
  allServiceUsersLabel,
  onServiceUserChange,
  requiredCarersFilters,
  requiredCarersOptions,
  onRequiredCarersFiltersChange,
  allVisitsLabel,
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
  jobOperationalFilters = [],
  jobOperationalCounts,
  onToggleJobOperationalFilter,
  carerOperationalFilters = [],
  carerOnLeaveTodayCount = 0,
  onToggleCarerOperationalFilter,
  operationalIssuesCount = 0,
  layout,
  onLayoutChange,
  rowAxis,
  onRowAxisChange,
  showRunsOnBoard = false,
  onShowRunsOnBoardChange,
  rotaGapDisplay = 'both',
  onRotaGapDisplayChange,
}: Props) {
  const displayFormat = useScheduleJobsDisplayFormat()
  const branchComboboxOptions = React.useMemo(
    () =>
      withScheduleJobsFilterAllOption(
        allBranchesLabel,
        branchFilterOptions.map((option) => ({ value: option.id, label: option.label })),
      ),
    [allBranchesLabel, branchFilterOptions],
  )
  const formatBranchTriggerOptions = React.useCallback(
    (selected: Array<{ value: string; label: string }>) => {
      if (selected.length <= 1) return selected
      return [{ value: '__branch_summary__', label: `${selected.length} branches` }]
    },
    [],
  )
  const onRemoveBranchOption = React.useCallback(
    (option: { value: string; label: string }, current: string[]) => {
      if (option.value === '__branch_summary__' || option.value === SCHEDULE_JOBS_FILTER_ALL_VALUE) {
        return []
      }
      return current.filter((id) => id !== option.value)
    },
    [],
  )
  const formatMultiTriggerSummary = React.useCallback(
    (selected: Array<{ value: string; label: string }>, summaryLabel: string) => {
      if (selected.length <= 1) return selected
      return [{ value: '__summary__', label: `${selected.length} ${summaryLabel}` }]
    },
    [],
  )
  const onRemoveMultiSummary = React.useCallback(
    (option: { value: string }, current: string[]) => {
      if (option.value === '__summary__' || option.value === SCHEDULE_JOBS_FILTER_ALL_VALUE) return []
      return current.filter((id) => id !== option.value)
    },
    [],
  )
  const serviceUserMultiOptions = React.useMemo(
    () =>
      withScheduleJobsFilterAllOption(
        allServiceUsersLabel,
        serviceUsers.map((su) => ({ value: su.id, label: su.label })),
      ),
    [allServiceUsersLabel, serviceUsers],
  )
  const requiredCarersMultiOptions = React.useMemo(
    () =>
      withScheduleJobsFilterAllOption(
        allVisitsLabel,
        requiredCarersOptions.map((option) => ({
          value: option.value,
          label: option.description ? `${option.label} (${option.description})` : option.label,
        })),
      ),
    [allVisitsLabel, requiredCarersOptions],
  )
  const filterFieldClassName =
    'flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background px-3 py-2'
  const filterLabelClassName =
    'text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0'
  const filterComboboxClassName =
    'h-10 min-w-[min(18rem,52vw)] border-0 bg-transparent px-1 text-sm shadow-none'

  const activeBranchLabels =
    locationIds.length > 0
      ? branchFilterOptions
          .filter((option) => locationIds.includes(option.id))
          .map((option) => option.displayLabel)
      : []
  const activeServiceUserLabels =
    serviceUserIds.length > 0
      ? serviceUsers.filter((su) => serviceUserIds.includes(su.id)).map((su) => su.label)
      : []
  const hasActiveFilters =
    activeBranchLabels.length > 0 ||
    activeServiceUserLabels.length > 0 ||
    (layout === 'board' && requiredCarersFilters.length > 0)

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
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={scheduleJobsToolbarToggleClass(
                layout === 'board',
                'h-8 gap-1.5 px-3 text-xs font-semibold',
              )}
              onClick={() => onLayoutChange('board')}
              aria-pressed={layout === 'board'}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Rota board
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={scheduleJobsToolbarToggleClass(
                layout === 'runs',
                'h-8 gap-1.5 px-3 text-xs font-semibold',
              )}
              onClick={() => onLayoutChange('runs')}
              aria-pressed={layout === 'runs'}
            >
              <Route className="h-3.5 w-3.5" />
              Runs
            </Button>
          </div>

          {layout === 'board' ? (
            <div
              className="flex items-center rounded-lg border border-border bg-background p-0.5 shadow-sm"
              data-testid="schedule-jobs-row-axis-toggle"
            >
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={scheduleJobsToolbarToggleClass(
                  rowAxis === 'carers',
                  'h-8 gap-1.5 px-3 text-xs font-semibold',
                )}
                onClick={() => onRowAxisChange('carers')}
                aria-pressed={rowAxis === 'carers'}
              >
                <Users className="h-3.5 w-3.5" />
                By carer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={scheduleJobsToolbarToggleClass(
                  rowAxis === 'service-users',
                  'h-8 gap-1.5 px-3 text-xs font-semibold',
                )}
                onClick={() => onRowAxisChange('service-users')}
                aria-pressed={rowAxis === 'service-users'}
              >
                <UserRound className="h-3.5 w-3.5" />
                By service user
              </Button>
            </div>
          ) : null}

          {layout === 'board' && onShowRunsOnBoardChange ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={scheduleJobsToolbarToggleClass(
                showRunsOnBoard,
                'h-8 gap-1.5 px-3 text-xs font-semibold shadow-sm ring-1 ring-border/80',
              )}
              onClick={() => onShowRunsOnBoardChange(!showRunsOnBoard)}
              aria-pressed={showRunsOnBoard}
              data-testid="schedule-jobs-show-runs-on-board"
              title="Show run colours, legend, and labels on visit blocks"
            >
              <Route className="h-3.5 w-3.5" />
              Runs on board
            </Button>
          ) : null}

          {layout === 'board' && onRotaGapDisplayChange ? (
            <div
              className="flex items-center rounded-lg border border-border bg-background p-0.5 shadow-sm"
              data-testid="schedule-jobs-rota-gap-display"
            >
              {ROTA_GAP_DISPLAY_MODES.map((mode) => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={scheduleJobsToolbarToggleClass(
                    rotaGapDisplay === mode,
                    'h-8 px-2.5 text-[11px] font-semibold',
                  )}
                  onClick={() => onRotaGapDisplayChange(mode)}
                  aria-pressed={rotaGapDisplay === mode}
                  title={`Show ${rotaGapDisplayModeLabel(mode).toLowerCase()} on carer rows`}
                >
                  {mode === 'none' ? 'No gaps' : rotaGapDisplayModeLabel(mode)}
                </Button>
              ))}
            </div>
          ) : null}
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
          <div className="flex flex-wrap items-stretch gap-3">
            <div className={filterFieldClassName}>
              <span className={filterLabelClassName}>Branch</span>
              <div data-testid="schedule-jobs-location-filter" className="min-w-0 flex-1">
                <MultiSelect
                  options={branchComboboxOptions}
                  value={locationIds}
                  onChange={(next) => onLocationChange(normalizeScheduleJobsFilterChange(next))}
                  placeholder={allBranchesLabel}
                  searchPlaceholder="Search branches…"
                  disabled={branchFilterOptions.length === 0}
                  checkPosition="right"
                  isOptionSelected={isScheduleJobsFilterAllOptionSelected}
                  formatSelectedOptions={formatBranchTriggerOptions}
                  onRemoveOption={onRemoveBranchOption}
                  className={filterComboboxClassName}
                />
              </div>
            </div>

            <div className={filterFieldClassName}>
              <span className={filterLabelClassName}>Service user</span>
              <div data-testid="schedule-jobs-service-user-filter" className="min-w-0 flex-1">
                <MultiSelect
                  options={serviceUserMultiOptions}
                  value={serviceUserIds}
                  onChange={(next) => onServiceUserChange(normalizeScheduleJobsFilterChange(next))}
                  placeholder={allServiceUsersLabel}
                  searchPlaceholder="Search service users…"
                  disabled={serviceUsers.length === 0}
                  checkPosition="right"
                  isOptionSelected={isScheduleJobsFilterAllOptionSelected}
                  formatSelectedOptions={(selected) =>
                    formatMultiTriggerSummary(selected, 'service users')
                  }
                  onRemoveOption={onRemoveMultiSummary}
                  className={filterComboboxClassName}
                />
              </div>
            </div>

            {layout === 'board' ? (
              <div className={filterFieldClassName}>
                <span className={filterLabelClassName}>Carers required</span>
                <div data-testid="schedule-jobs-required-carers-filter" className="min-w-0 flex-1">
                  <MultiSelect
                    options={requiredCarersMultiOptions}
                    value={requiredCarersFilters}
                    onChange={(next) =>
                      onRequiredCarersFiltersChange(
                        normalizeScheduleJobsFilterChange(next).filter(
                          (value): value is ScheduleJobsRequiredCarersFilterValue =>
                            value === '1' || value === '2' || value === '3plus',
                        ),
                      )
                    }
                    placeholder={allVisitsLabel}
                    searchPlaceholder="Filter by carers required…"
                    checkPosition="right"
                    isOptionSelected={isScheduleJobsFilterAllOptionSelected}
                    formatSelectedOptions={(selected) =>
                      formatMultiTriggerSummary(selected, 'carer types')
                    }
                    onRemoveOption={onRemoveMultiSummary}
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
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-l border-border/80 pl-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Show issues
                  </span>
                  {SCHEDULE_JOB_OPERATIONAL_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={jobOperationalFilters.includes(filter)}
                      onClick={() => onToggleJobOperationalFilter?.(filter)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        jobOperationalFilters.includes(filter)
                          ? 'border-amber-500/50 bg-amber-50 text-amber-900 shadow-sm dark:bg-amber-950/40 dark:text-amber-100'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50',
                      )}
                    >
                      {scheduleJobOperationalFilterLabel(filter)}
                      <span className="tabular-nums opacity-80">
                        ({jobOperationalCounts?.[filter] ?? 0})
                      </span>
                    </button>
                  ))}
                  {SCHEDULE_CARER_OPERATIONAL_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={carerOperationalFilters.includes(filter)}
                      onClick={() => onToggleCarerOperationalFilter?.(filter)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        carerOperationalFilters.includes(filter)
                          ? 'border-amber-500/50 bg-amber-50 text-amber-900 shadow-sm dark:bg-amber-950/40 dark:text-amber-100'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50',
                      )}
                    >
                      {scheduleCarerOperationalFilterLabel(filter)}
                      <span className="tabular-nums opacity-80">({carerOnLeaveTodayCount})</span>
                    </button>
                  ))}
                  {operationalIssuesCount > 0 ? (
                    <span className="text-[10px] text-muted-foreground">
                      {operationalIssuesCount} visit{operationalIssuesCount === 1 ? '' : 's'} with issues
                    </span>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create runs, add visits, and set visit order for {displayFormat.formatDate(date)}.
            </p>
          )}

          {hasActiveFilters ? (
            <p className="text-xs text-muted-foreground">
              {activeBranchLabels.length > 0 ? (
                <>
                  Branch{activeBranchLabels.length > 1 ? 'es' : ''}:{' '}
                  <span className="font-medium text-foreground">
                    {activeBranchLabels.join(' · ')}
                  </span>
                  {activeServiceUserLabels.length > 0 || (layout === 'board' && requiredCarersFilters.length > 0)
                    ? ' · '
                    : ''}
                </>
              ) : null}
              {activeServiceUserLabels.length > 0 ? (
                <>
                  Service user{activeServiceUserLabels.length > 1 ? 's' : ''}:{' '}
                  <span className="font-medium text-foreground">
                    {activeServiceUserLabels.join(' · ')}
                  </span>
                  {layout === 'board' && requiredCarersFilters.length > 0 ? ' · ' : ''}
                </>
              ) : null}
              {layout === 'board' && requiredCarersFilters.length > 0 ? (
                <>
                  Carers required:{' '}
                  <span className="font-medium text-foreground">
                    {scheduleJobsRequiredCarersFiltersLabel(
                      requiredCarersFilters as ScheduleJobsRequiredCarersFilterValue[],
                    )}
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
