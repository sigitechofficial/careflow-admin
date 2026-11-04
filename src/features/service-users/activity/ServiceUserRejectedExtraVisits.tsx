import * as React from 'react'
import { Ban, Loader2 } from 'lucide-react'
import { useServiceUserVisitPlans } from '@/features/service-users/visit-plan/hooks'
import {
  useVisitPlanDateChangesForPlans,
  type VisitPlanDateChange,
} from '@/features/service-users/visit-plan/visit-plan-date-changes.api'
import { formatVisitPlanWeeklyHours } from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyInTimeZone } from '@/shared/lib/operational-day.util'
import { contentBodyClass, contentHelperClass, contentTitleClass } from '@/shared/ui/content-section'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'

/**
 * Extra visits a manager rejected (they went over the service user's weekly hours and were
 * never added): who asked, who rejected, when and why.
 */
export function ServiceUserRejectedExtraVisits({
  serviceUserId,
  dateFrom,
  dateTo,
}: {
  serviceUserId: string
  dateFrom: string
  dateTo: string
}) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const plansQuery = useServiceUserVisitPlans(serviceUserId)
  const planIds = React.useMemo(() => (plansQuery.data ?? []).map(p => p.id), [plansQuery.data])
  const changeQueries = useVisitPlanDateChangesForPlans(serviceUserId, planIds)
  const loading = plansQuery.isLoading || changeQueries.some(q => q.isLoading)
  const error = plansQuery.error ?? changeQueries.find(q => q.error)?.error ?? null

  const rows = React.useMemo<VisitPlanDateChange[]>(
    () =>
      changeQueries
        .flatMap(q => q.data?.changes ?? [])
        .filter(
          c =>
            c.type === 'EXTRA_REQUEST' &&
            c.approvalStatus === 'REJECTED' &&
            c.date >= dateFrom &&
            c.date <= dateTo,
        )
        .sort((a, b) => `${a.date}|${a.plannedStartTime}`.localeCompare(`${b.date}|${b.plannedStartTime}`)),
    [changeQueries, dateFrom, dateTo],
  )

  const at = (iso: string | null | undefined) =>
    iso ? `${formatDate(dayKeyInTimeZone(iso))} ${formatTime(iso)}` : 'Not recorded'

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading rejected extra visits…
      </div>
    )
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : 'Could not load rejected extra visits'}
      </p>
    )
  }
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
        <Ban className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
        <p className={cn('mt-3 font-medium', contentTitleClass)}>No rejected extra visits in this range</p>
        <p className={cn('mx-auto mt-1 max-w-md', contentHelperClass)}>Try a wider date range.</p>
      </div>
    )
  }

  return (
    <>
      <ul className="space-y-2" data-testid="activity-rejected-list">
        {rows.map(row => {
          const fields: Array<[string, string | null]> = [
            ['Asked by', row.recordedByName ?? 'Not recorded'],
            ['Asked on', at(row.recordedAt)],
            ['Why it was asked', row.notes || null],
            [
              'Weekly hours',
              row.weekMinutes != null && row.limitWeeklyHours != null
                ? `That week would have had ${formatVisitPlanWeeklyHours(row.weekMinutes)} of ${formatVisitPlanWeeklyHours(
                    Math.round(row.limitWeeklyHours * 60),
                  )}`
                : null,
            ],
            ['Rejected by', row.decidedByName ?? 'Not recorded'],
            ['Rejected on', at(row.decidedAt)],
            ['Reason', row.decisionNotes || 'No reason given'],
          ]
          return (
            <li
              key={row.id}
              className="rounded-lg border border-border/70 bg-card px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-foreground">{row.slotLabel} (extra)</p>
                <Badge variant="destructive" className="shrink-0">
                  Rejected
                </Badge>
                <span className={contentHelperClass}>Not added to the rota</span>
              </div>
              <p className={cn('mt-1', contentHelperClass)}>
                {formatDate(row.date)} · {row.plannedStartTime}–{row.plannedEndTime}
              </p>
              <dl className={cn('mt-2 grid gap-x-4 gap-y-0.5 sm:grid-cols-[8rem_1fr]', contentBodyClass)}>
                {fields
                  .filter((f): f is [string, string] => Boolean(f[1]))
                  .map(([term, value]) => (
                    <React.Fragment key={term}>
                      <dt className={contentHelperClass}>{term}</dt>
                      <dd>{value}</dd>
                    </React.Fragment>
                  ))}
              </dl>
            </li>
          )
        })}
      </ul>
      <p className={contentHelperClass}>
        {rows.length} rejected extra visit{rows.length === 1 ? '' : 's'}
      </p>
    </>
  )
}
