import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { formatHoursMinutes, jobBlockCompletedSurfaceStyle } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  SCHEDULE_JOB_OPERATIONAL_FILTERS,
  scheduleJobOperationalFilterLabel,
  type ScheduleJobOperationalFilter,
  type ScheduleJobOutcomeFilter,
} from '@/features/scheduling/utils/schedule-job-board-filter.util'
import { ScheduleTimeSensitiveFilterChip } from '@/features/scheduling/components/schedule-filters/ScheduleTimeSensitiveFilterChip'

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
        accent === 'emerald' &&
          'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/40',
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
    swatchClass: 'border border-rose-500/80 bg-gradient-to-b from-rose-50 to-rose-100',
  },
  {
    id: 'completed',
    label: 'Completed',
    swatchClass: 'border border-[#6ee7b7]',
    swatchStyle: jobBlockCompletedSurfaceStyle,
  },
]

export type ScheduleJobsOpsSummaryBarProps = {
  requiredMinutes: number
  bookedMinutes: number
  overBookedMinutes?: number
  unassignedCount: number
  carersWorking: number
  jobOutcomeFilters: ReadonlySet<ScheduleJobOutcomeFilter>
  jobOutcomeCounts: Record<ScheduleJobOutcomeFilter, number>
  onToggleJobOutcomeFilter: (filter: ScheduleJobOutcomeFilter) => void
  jobOperationalFilters: ScheduleJobOperationalFilter[]
  jobOperationalCounts: Record<ScheduleJobOperationalFilter, number>
  onToggleJobOperationalFilter: (filter: ScheduleJobOperationalFilter) => void
  timeSensitiveFilter?: boolean
  timeSensitiveCount?: number
  onToggleTimeSensitiveFilter?: () => void
  operationalIssuesCount: number
  /** Softer copy when stats span a multi-day list period. */
  statsScopeNote?: string
}

/** Shared Required/Booked chips + Show jobs / Show issues (board + list). */
export function ScheduleJobsOpsSummaryBar({
  requiredMinutes,
  bookedMinutes,
  overBookedMinutes = 0,
  unassignedCount,
  carersWorking,
  jobOutcomeFilters,
  jobOutcomeCounts,
  onToggleJobOutcomeFilter,
  jobOperationalFilters,
  jobOperationalCounts,
  onToggleJobOperationalFilter,
  timeSensitiveFilter = false,
  timeSensitiveCount = 0,
  onToggleTimeSensitiveFilter,
  operationalIssuesCount,
  statsScopeNote,
}: ScheduleJobsOpsSummaryBarProps) {
  return (
    <div className="space-y-3" data-testid="schedule-jobs-ops-summary">
      <div className="flex flex-wrap items-center gap-2">
        <StatChip
          label="Required carer h"
          value={formatHoursMinutes(requiredMinutes)}
          title={statsScopeNote ?? 'Sum of (visit duration × carers required)'}
        />
        <StatChip
          label="Booked"
          value={formatHoursMinutes(bookedMinutes)}
          accent={overBookedMinutes > 0 ? 'rose' : 'emerald'}
          title="Total assigned carer-hours in the current filter set"
        />
        {overBookedMinutes > 0 ? (
          <StatChip
            label="Over booked"
            value={formatHoursMinutes(overBookedMinutes)}
            accent="rose"
            title="Booked carer-hours exceed required carer-hours"
          />
        ) : null}
        <StatChip label="Carers working" value={carersWorking} accent="sky" />
        {unassignedCount > 0 ? (
          <StatChip label="Unassigned" value={unassignedCount} accent="amber" />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Show jobs
          </span>
          {OUTCOME_FILTER_META.map((option) => {
            const active = jobOutcomeFilters.has(option.id)
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleJobOutcomeFilter(option.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary/40 bg-primary/10 text-foreground shadow-sm'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50',
                )}
              >
                <span
                  className={cn('h-2.5 w-4 shrink-0 rounded-sm', option.swatchClass)}
                  style={option.swatchStyle}
                  aria-hidden
                />
                {option.label}
                <span className="tabular-nums opacity-80">({jobOutcomeCounts[option.id]})</span>
              </button>
            )
          })}
          {onToggleTimeSensitiveFilter ? (
            <ScheduleTimeSensitiveFilterChip
              active={timeSensitiveFilter}
              count={timeSensitiveCount}
              onToggle={onToggleTimeSensitiveFilter}
            />
          ) : null}
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
              onClick={() => onToggleJobOperationalFilter(filter)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                jobOperationalFilters.includes(filter)
                  ? 'border-amber-500/50 bg-amber-50 text-amber-900 shadow-sm dark:bg-amber-950/40 dark:text-amber-100'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50',
              )}
            >
              {scheduleJobOperationalFilterLabel(filter)}
              <span className="tabular-nums opacity-80">({jobOperationalCounts[filter] ?? 0})</span>
            </button>
          ))}
          {operationalIssuesCount > 0 ? (
            <span className="text-[10px] text-muted-foreground">
              {operationalIssuesCount} visit{operationalIssuesCount === 1 ? '' : 's'} with issues
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
