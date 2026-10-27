import { AlertTriangle, Loader2 } from 'lucide-react'
import { useServiceUserHoursImpact } from '@/features/hours-approvals/hooks'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'

/** 1550 → "25h 50m". */
function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Lower weekly hours: the weeks over the new hours and, when Settings → Dom Rules cancels
 * visits, which ones. Nothing is saved here.
 */
export function ServiceUserHoursDecreaseImpact({
  serviceUserId,
  weeklyHours,
}: {
  serviceUserId: string
  weeklyHours: number
}) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const query = useServiceUserHoursImpact(serviceUserId, weeklyHours)
  const impact = query.data

  if (query.isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Checking visits against the new hours…
      </p>
    )
  }
  if (!impact) return null
  if (!impact.overWeeks.length) {
    return <p className="text-xs text-muted-foreground">No week goes over the new hours. No visits change.</p>
  }

  const limit = formatMinutes(impact.limitMinutes)
  const weekLine = (w: { weekStart: string; minutes: number }) =>
    `week of ${formatDate(w.weekStart)}: ${formatMinutes(w.minutes)} of ${limit}`

  return (
    <div
      className="space-y-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
      data-testid="su-hours-decrease-impact"
    >
      <p className="flex items-start gap-2 font-medium">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {impact.overWeeks.length} week{impact.overWeeks.length === 1 ? '' : 's'} over the new hours
      </p>
      <ul className="ml-5 list-disc space-y-0.5">
        {impact.overWeeks.map(w => (
          <li key={w.weekStart}>{weekLine(w)}</li>
        ))}
      </ul>
      {impact.decreaseAction === 'KEEP_WARN' ? (
        <p>The visits stay as they are. The visit plan shows these weeks as over the weekly hours.</p>
      ) : (
        <>
          <p>
            {impact.visitsToCancel.length
              ? `These ${impact.visitsToCancel.length} visit${impact.visitsToCancel.length === 1 ? ' is' : 's are'} cancelled (no charge), the latest in each week first:`
              : 'No visits can be cancelled automatically.'}
          </p>
          {impact.visitsToCancel.length ? (
            <ul className="ml-5 max-h-40 list-disc space-y-0.5 overflow-y-auto">
              {impact.visitsToCancel.map(v => (
                <li key={`${v.date}-${v.startDateTime}`}>
                  {formatDate(dayKeyFromInstant(v.startDateTime) ?? v.date)} {formatTime(v.startDateTime)}–
                  {formatTime(v.endDateTime)} · {v.slotLabel}
                  {v.onRota ? '' : ' (not on the rota yet)'}
                </li>
              ))}
            </ul>
          ) : null}
          {impact.stillOverWeeks.length ? (
            <p>
              Still over after that (time-critical visits are never cancelled automatically):{' '}
              {impact.stillOverWeeks.map(weekLine).join('; ')}.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
