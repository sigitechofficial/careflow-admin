import * as React from 'react'
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useEmployeeHoursMonthlyDetail } from '@/features/employees/hooks/useEmployeeHours'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { ContentCard } from '@/shared/ui/content-section'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`
}

function shiftMonth(monthKey: string, delta: number): string {
  const [y = 0, m = 1] = monthKey.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`
}

function formatHours(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n.toFixed(n % 1 === 0 ? 0 : 2)}h`
}

function formatPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${Math.round(n)}%`
}

function datesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string | null
  employeeName?: string
  initialMonth?: string
  listWeekStart?: string
  listWeekEnd?: string
  listWeekAssignedHours?: number
  listWeekAssignedVisits?: number
  listWeekWorkedVisits?: number
}

export function EmployeeHoursDetailDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  initialMonth,
  listWeekStart,
  listWeekEnd,
  listWeekAssignedHours,
  listWeekAssignedVisits,
  listWeekWorkedVisits,
}: Props) {
  const [month, setMonth] = React.useState(initialMonth || currentMonthKey())
  const [expandedWeek, setExpandedWeek] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (open) {
      setMonth(initialMonth || currentMonthKey())
      setExpandedWeek(null)
    }
  }, [open, initialMonth, employeeId])

  const query = useEmployeeHoursMonthlyDetail(
    open && employeeId ? { employeeId, month } : null,
    open,
  )
  const data = query.data
  const showListWeekContext =
    listWeekStart != null &&
    listWeekEnd != null &&
    listWeekAssignedVisits != null &&
    listWeekWorkedVisits != null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" data-testid="employee-hours-detail-dialog">
        <DialogHeader>
          <DialogTitle>
            Monthly hours — {data?.employee.employeeName ?? employeeName ?? 'Employee'}
          </DialogTitle>
          <DialogDescription>
            This dialog is the full calendar month (day blocks 1–7 · 8–14 · 15–21 · 22–28 · 29–end).
            The list row is one Mon–Sun week — visit totals will not match the month total.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Previous month"
              onClick={() => setMonth(m => shiftMonth(m, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[10rem] text-center">
              <p className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground">
                <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {data ? `${data.monthName} ${data.year}` : month}
              </p>
              <p className="text-xs text-muted-foreground">
                {data
                  ? `${data.daysInMonth} days · ${data.weekScheme ?? '1–7 · 8–14 · 15–21 · 22–28 · 29+'}`
                  : month}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Next month"
              onClick={() => setMonth(m => shiftMonth(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <input
              type="month"
              className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={month}
              aria-label="Select month"
              onChange={e => {
                if (e.target.value) setMonth(e.target.value)
              }}
              data-testid="employee-hours-detail-month"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setMonth(currentMonthKey())}
            >
              This month
            </Button>
          </div>

          {showListWeekContext ? (
            <div
              className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm"
              data-testid="employee-hours-list-week-context"
            >
              <p className="font-medium text-foreground">Selected list week (Mon–Sun)</p>
              <p className="mt-0.5 text-muted-foreground">
                {listWeekStart} → {listWeekEnd}
                {' · '}
                <span className="tabular-nums text-foreground">
                  {listWeekWorkedVisits} / {listWeekAssignedVisits}
                </span>{' '}
                visits
                {listWeekAssignedHours != null ? (
                  <>
                    {' · '}
                    <span className="tabular-nums text-foreground">
                      {formatHours(listWeekAssignedHours)}
                    </span>{' '}
                    assigned
                  </>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Calendar week rows that overlap this Mon–Sun week are highlighted. Month total
                visits below count the whole month, not this week alone.
              </p>
            </div>
          ) : null}

          {query.isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
              <p className="text-sm text-muted-foreground">Loading monthly hours…</p>
            </div>
          ) : query.isError ? (
            <p className="text-sm text-destructive">Could not load monthly hours detail.</p>
          ) : data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    {
                      title: 'Weekly contract',
                      value: formatHours(data.weeklyHours),
                      hint: data.immigration
                        ? `${data.immigration.label}${
                            data.effectiveCapHours != null
                              ? ` · cap ${formatHours(data.effectiveCapHours)}`
                              : ''
                          }`
                        : 'Contracted weekly hours',
                      icon: <Briefcase className="h-4 w-4" aria-hidden />,
                      tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
                    },
                    {
                      title: 'Assigned (month)',
                      value: formatHours(data.totals.assignedHours),
                      hint: `${data.totals.assignedVisits} scheduled visits`,
                      icon: <CalendarClock className="h-4 w-4" aria-hidden />,
                      tone: 'bg-primary/10 text-primary',
                    },
                    {
                      title: 'Worked (month)',
                      value: formatHours(data.totals.hoursWorked),
                      hint: `${data.totals.workedVisits} payable visits`,
                      icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
                      tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                    },
                    {
                      title: 'Over contract weeks',
                      value: String(data.totals.overContractWeekCount),
                      hint: `${formatHours(data.totals.hoursOverContract)} total over contract`,
                      icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
                      tone: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
                    },
                  ] as const
                ).map(card => (
                  <ContentCard key={card.title} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                      <span
                        className={cn(
                          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          card.tone,
                        )}
                      >
                        {card.icon}
                      </span>
                    </div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{card.hint}</p>
                  </ContentCard>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/60">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Week
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Contract
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Assigned
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Worked
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Utilisation
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Over contract
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Visits
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.weeks.map(week => {
                      const over = week.hoursOverContract > 0 || week.hoursOverAssigned > 0
                      const expanded = expandedWeek === week.weekNumber
                      const overlapsListWeek =
                        Boolean(listWeekStart && listWeekEnd) &&
                        datesOverlap(
                          listWeekStart!,
                          listWeekEnd!,
                          week.weekStart,
                          week.weekEnd,
                        )
                      const dayLabels = week.dayLabels?.length
                        ? week.dayLabels
                        : Array.from(
                            { length: week.dayTo - week.dayFrom + 1 },
                            (_, i) => String(week.dayFrom + i),
                          )
                      return (
                        <React.Fragment key={week.weekStart}>
                          <tr
                            className={cn(
                              'border-b border-border last:border-0 hover:bg-muted/20',
                              over && 'bg-warning/5',
                              overlapsListWeek && 'ring-1 ring-inset ring-primary/40 bg-primary/5',
                            )}
                            data-testid={`employee-hours-detail-week-${week.weekNumber}`}
                          >
                            <td className="px-3 py-2.5">
                              <button
                                type="button"
                                className="text-left"
                                onClick={() =>
                                  setExpandedWeek(expanded ? null : week.weekNumber)
                                }
                              >
                                <span className="font-medium text-foreground">{week.label}</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  Days {week.dayRangeLabel ?? `${week.dayFrom}–${week.dayTo}`}
                                  {overlapsListWeek ? ' · overlaps list week' : ''}
                                </span>
                              </button>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {formatHours(week.weeklyHours)}
                            </td>
                            <td
                              className={cn(
                                'px-3 py-2.5 text-right tabular-nums',
                                week.hoursOverAssigned > 0 &&
                                  'font-semibold text-amber-800 dark:text-amber-300',
                              )}
                            >
                              {formatHours(week.assignedHours)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                              {formatHours(week.hoursWorked)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {formatPct(week.assignedUtilisationPct)}
                            </td>
                            <td
                              className={cn(
                                'px-3 py-2.5 text-right tabular-nums',
                                week.hoursOverContract > 0 &&
                                  'font-semibold text-amber-800 dark:text-amber-300',
                              )}
                            >
                              {week.hoursOverContract > 0 ? (
                                <Badge variant="solid-warning" size="sm">
                                  +{formatHours(week.hoursOverContract)}
                                </Badge>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {week.workedVisits}
                              <span className="text-xs text-muted-foreground">
                                {' '}
                                / {week.assignedVisits}
                              </span>
                            </td>
                          </tr>
                          {expanded ? (
                            <tr className="border-b border-border bg-muted/10">
                              <td colSpan={7} className="px-3 py-3">
                                <p className="mb-2 text-xs font-medium text-muted-foreground">
                                  Worked hours by day of month
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {dayLabels.map((dayLabel, i) => {
                                    const worked = week.dayHours[i] ?? 0
                                    return (
                                      <div
                                        key={`${week.weekNumber}-${dayLabel}`}
                                        className="flex w-14 flex-col items-center rounded-md border border-border bg-background px-1 py-1.5"
                                      >
                                        <span className="text-[10px] text-muted-foreground">
                                          {dayLabel}
                                        </span>
                                        <span className="text-xs font-medium tabular-nums">
                                          {worked > 0 ? formatHours(worked) : '—'}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-muted/40">
                    <tr>
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        Month total ({data.daysInMonth} days · {data.totals.weekCount} weeks)
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatHours(data.expectedContractHours)}
                        <span className="mt-0.5 block text-[10px]">expected</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {formatHours(data.totals.assignedHours)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {formatHours(data.totals.hoursWorked)}
                      </td>
                      <td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {data.totals.hoursOverContract > 0
                          ? formatHours(data.totals.hoursOverContract)
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {data.totals.workedVisits}
                        <span className="text-xs text-muted-foreground">
                          {' '}
                          / {data.totals.assignedVisits}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
                          month
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : null}
        </DialogBody>

        <DialogFooter>
          {employeeId ? (
            <Button variant="outline" asChild>
              <Link to="/employee/$employeeId/edit" params={{ employeeId }}>
                Open employee
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
