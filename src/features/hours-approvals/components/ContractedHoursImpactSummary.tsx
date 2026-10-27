import { Fragment, useState } from 'react'
import { ChevronRight, Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import type { ContractedHoursImpact } from '@/features/hours-approvals/types'

/** 10 → "10h", 6.5 → "6.5h". */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null) return '—'
  const rounded = Math.round(hours * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}h`
}

/** "AFTERNOON__2" → "Afternoon". */
function slotLabel(slotCode: string): string {
  const base = slotCode.split('__')[0] ?? slotCode
  return base.charAt(0) + base.slice(1).toLowerCase()
}

function dayList(days: number[]): string {
  return days.map(d => VISIT_PLAN_DAY_LABELS[d]).join(', ')
}

type Props = {
  impact: ContractedHoursImpact
  /** Request already sent: say the numbers are worked out again when it is approved. */
  pending?: boolean
  className?: string
}

/**
 * What a contracted weekly hours change does: per rota week, which visits get unassigned,
 * and which visit-plan days the carer is taken off.
 */
export function ContractedHoursImpactSummary({ impact, pending, className }: Props) {
  const { formatDate, formatWeekdayShort, formatTimeRangeHm } = useOrganisationDisplayFormat()
  const from = impact.previousContractedWeeklyHours
  const to = impact.requestedContractedWeeklyHours
  const totalVisits = impact.weeks.reduce((sum, week) => sum + week.visitsToUnassign, 0)
  const totalHours = impact.weeks.reduce((sum, week) => sum + week.hoursToUnassign, 0)
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(() => new Set())
  const toggleWeek = (weekStart: string) =>
    setOpenWeeks(prev => {
      const next = new Set(prev)
      if (next.has(weekStart)) next.delete(weekStart)
      else next.add(weekStart)
      return next
    })

  return (
    <div className={cn('space-y-3 text-sm', className)}>
      <p className="text-foreground">
        Contracted weekly hours{' '}
        <span className="font-medium tabular-nums">
          {formatHours(from)} → {formatHours(to)}
        </span>
        {impact.limitWeeklyHours !== to ? (
          <span className="text-muted-foreground">
            {' '}
            (limit {formatHours(impact.limitWeeklyHours)} while approved extra hours are active)
          </span>
        ) : null}
      </p>

      {!impact.isDecrease ? (
        <p className="text-muted-foreground">
          Only the contracted hours change. No visits are unassigned.
        </p>
      ) : (
        <>
          <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>
              Each week (Monday–Sunday) is counted from its first day, done and booked visits
              together. In the week the change is approved, visits already done or started stay as
              they are; the visit that takes the carer over {formatHours(impact.limitWeeklyHours)}{' '}
              and every later visit that week are unassigned. The same applies to every later week
              already on the rota.
            </p>
          </div>

          {impact.weeks.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rota</p>
              <p className="text-foreground">
                {totalVisits > 0 ? (
                  <>
                    <span className="font-medium text-red-700 dark:text-red-300">
                      {totalVisits} visit{totalVisits === 1 ? '' : 's'} ({formatHours(totalHours)})
                    </span>{' '}
                    will be unassigned from this carer.
                  </>
                ) : (
                  'No booked visits will be unassigned.'
                )}
              </p>
              {impact.weeks.some(week => week.visits?.length) ? (
                <p className="text-xs text-muted-foreground">Open a week to see which visits.</p>
              ) : null}
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Week starting</th>
                      <th className="px-3 py-1.5 text-right font-medium">Booked now</th>
                      <th className="px-3 py-1.5 text-right font-medium">Unassigned</th>
                      <th className="px-3 py-1.5 text-right font-medium">Booked after</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border tabular-nums">
                    {impact.weeks.map(week => {
                      const hasVisits = Boolean(week.visits?.length)
                      const isOpen = hasVisits && openWeeks.has(week.weekStart)
                      return (
                      <Fragment key={week.weekStart}>
                      <tr
                        className={cn(hasVisits && 'cursor-pointer hover:bg-muted/40')}
                        onClick={hasVisits ? () => toggleWeek(week.weekStart) : undefined}
                      >
                        <td className="px-3 py-1.5 text-foreground">
                          {hasVisits ? (
                            <button
                              type="button"
                              className="mr-1 inline-flex h-4 w-4 items-center justify-center align-[-2px] text-muted-foreground"
                              aria-expanded={isOpen}
                              aria-label={`${isOpen ? 'Hide' : 'Show'} visits for week of ${formatDate(week.weekStart)}`}
                              onClick={e => {
                                e.stopPropagation()
                                toggleWeek(week.weekStart)
                              }}
                            >
                              <ChevronRight className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
                            </button>
                          ) : (
                            <span className="mr-1 inline-block w-4" aria-hidden />
                          )}
                          {formatDate(week.weekStart)}
                          {week.isCurrentWeek ? (
                            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                              This week
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">
                          {formatHours(week.bookedHours)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {week.visitsToUnassign > 0 ? (
                            <span className="font-medium text-red-700 dark:text-red-300">
                              {week.visitsToUnassign} visit{week.visitsToUnassign === 1 ? '' : 's'} ·{' '}
                              {formatHours(week.hoursToUnassign)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              None{week.bookedHours > impact.limitWeeklyHours ? '*' : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium text-foreground">
                          {formatHours(week.hoursAfter)}
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="bg-muted/20">
                          <td colSpan={4} className="py-1.5 pl-8 pr-3">
                            <ul className="space-y-0.5 border-l-2 border-red-300 pl-2 text-xs text-muted-foreground dark:border-red-800">
                              {(week.visits ?? []).map(visit => (
                                <li key={`${visit.date}-${visit.startTime}-${visit.serviceUserName}`}>
                                  <span className="text-foreground">
                                    {formatWeekdayShort(visit.date)} {formatDate(visit.date)}
                                  </span>{' '}
                                  · {formatTimeRangeHm(visit.startTime, visit.endTime)} · {visit.serviceUserName}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ) : null}
                      </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {impact.weeks.some(
                week => week.visitsToUnassign === 0 && week.bookedHours > impact.limitWeeklyHours,
              ) ? (
                <p className="text-xs text-muted-foreground">
                  * Visits over the limit that week are already done or started, so they stay as they are.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground">No rota visits are over the new limit.</p>
          )}

          {impact.planChanges.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Visit plan
              </p>
              <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {impact.planChanges.map(change => (
                  <li key={change.visitPlanSlotId} className="px-3 py-1.5">
                    <p className="text-foreground">
                      {change.serviceUserName} · {slotLabel(change.slotCode)}{' '}
                      {change.plannedStartTime}–{change.plannedEndTime}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Taken off {dayList(change.removedDays)}
                      {change.keptDays.length ? ` · keeps ${dayList(change.keptDays)}` : ''} ·{' '}
                      {formatHours(change.weeklyHoursRemoved)} a week
                    </p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Visit plan hours {formatHours(impact.planWeeklyHours)} →{' '}
                {formatHours(impact.planWeeklyHoursAfter)} a week, so new rota stays within the limit.
                Single-carer visits on those days become unassigned; on double-up visits only this
                carer is removed.
              </p>
            </div>
          ) : null}

          {pending ? (
            <p className="text-xs text-muted-foreground">
              These numbers are from when the request was sent. They are worked out again at the
              moment it is approved.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
