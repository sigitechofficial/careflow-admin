import { Link } from '@tanstack/react-router'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Loader2,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import {
  formatHoursMinutes,
  formatScheduleJobsDayMonth,
  formatScheduleJobsWeekday,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { todayIso } from '@/features/scheduling/utils/scheduling-format'

type GroupBy = 'none' | 'area'

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
  groupBy: GroupBy
  onGroupByChange: (value: GroupBy) => void
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
}

export function ScheduleJobsToolbar({
  date,
  groupBy,
  onGroupByChange,
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
}: Props) {
  const isToday = date === todayIso()

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
            <label className="flex h-8 cursor-pointer items-center border-l border-border px-2.5 hover:bg-muted/50">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                className="sr-only"
                aria-label="Pick schedule date"
              />
            </label>
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
              <p className="text-xs text-muted-foreground">Daily rota · drag to reschedule or reassign</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Group</span>
            <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
              <SelectTrigger className="h-7 w-[96px] border-0 bg-transparent px-1 text-xs shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="area">Area</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {hasError ? (
          <p className="text-sm text-destructive">Could not load schedule data. Try refresh.</p>
        ) : isLoading ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading schedule…
          </span>
        ) : (
          <>
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
          </>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" asChild>
            <Link to="/scheduling/view" search={{ date }}>
              <Users className="h-3.5 w-3.5" />
              Runs
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
    </div>
  )
}
