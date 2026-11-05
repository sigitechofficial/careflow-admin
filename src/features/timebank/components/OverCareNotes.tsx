import * as React from 'react'
import { Info, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { useOverCareForWeek } from '@/features/timebank/hooks/useTimebank'
import type { OverCareForWeek, TimebankOverCare, TimebankOverCareSetting } from '@/features/timebank/types'
import { formatMinutes, shiftWeek } from '@/features/timebank/timebank-format'

/**
 * Info tag where over care shows (docs/SU_OVER_CARE_ADJUST_PLAN.md): the week's over care and what
 * the next week did (or will do) about it, with "See visits". On a week whose hours were lowered
 * for the week before, it says so instead.
 */
export function OverCareTag({
  serviceUserId,
  weekStart,
  overMinutes,
  adjustment,
  takenBack,
  setting,
  currentWeekStart,
}: {
  serviceUserId: string
  weekStart: string
  overMinutes: number
  adjustment: TimebankOverCare | null
  takenBack: TimebankOverCare | null
  setting: TimebankOverCareSetting | undefined
  currentWeekStart: string
}) {
  const { formatDate } = useOrganisationDisplayFormat()
  const [openWeek, setOpenWeek] = React.useState<string | null>(null)
  const nextWeek = shiftWeek(weekStart, 1)

  let text: string | null = null
  if (adjustment) {
    text =
      `Over care given — ${formatMinutes(adjustment.takenBackMinutes)} taken back in the week of ${formatDate(adjustment.adjustWeekStart)}` +
      ` (${adjustment.cancelledVisits} visit${adjustment.cancelledVisits === 1 ? '' : 's'} cancelled)` +
      (adjustment.notTakenBackMinutes > 0 ? `; ${formatMinutes(adjustment.notTakenBackMinutes)} not taken back` : '')
  } else if (overMinutes > 0 && setting) {
    if (!setting.on) text = 'Over care given — not taken back (setting off)'
    else if (setting.from && weekStart < setting.from) text = null
    else if (nextWeek < currentWeekStart) text = 'Over care given — not taken back'
    else text = `Over care given — visits in the week of ${formatDate(nextWeek)} may be cancelled to take it back`
  }

  return (
    <>
      {takenBack ? (
        <span className="mt-1 flex items-start gap-1 text-xs font-normal text-sky-700 dark:text-sky-400" data-testid="over-care-taken-back">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>
            Hours lowered by {formatMinutes(takenBack.takenBackMinutes)} — over care in the week of{' '}
            {formatDate(takenBack.overWeekStart)}.{' '}
            <button type="button" className="font-medium underline" onClick={() => setOpenWeek(takenBack.overWeekStart)}>
              See visits
            </button>
          </span>
        </span>
      ) : null}
      {text ? (
        <span className="mt-1 flex items-start gap-1 text-xs font-normal text-sky-700 dark:text-sky-400" data-testid="over-care-tag">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>
            {text}.{' '}
            <button type="button" className="font-medium underline" onClick={() => setOpenWeek(weekStart)}>
              See visits
            </button>
          </span>
        </span>
      ) : null}
      <OverCareDialog
        serviceUserId={serviceUserId}
        weekStart={openWeek}
        onClose={() => setOpenWeek(null)}
      />
    </>
  )
}

const STATUS_TEXT: Record<OverCareForWeek['status'], string> = {
  DONE: 'Taken back: these visits were cancelled (no charge). Each visit has the reason.',
  WILL_CANCEL:
    'These visits will be cancelled (no charge) when the nightly run takes the over care back. Visits on the day it runs are kept.',
  NOTHING: 'No over care to take back, once timebank-paid and manager-approved hours are left out.',
  OFF: 'Settings → Dom Rules "Reduce next week\'s visits after over care" is off: nothing is cancelled.',
  NOT_ELIGIBLE: 'This week is before over care started being taken back: nothing is cancelled.',
  NOT_ADJUSTED: 'The next week has passed without taking it back: nothing is cancelled.',
  NO_PLAN: 'The service user has no active visit plan: no visits can be cancelled.',
}

/** "See visits": the week's over care and the next week's visits it took back, or would. */
export function OverCareDialog({
  serviceUserId,
  weekStart,
  onClose,
}: {
  serviceUserId: string
  weekStart: string | null
  onClose: () => void
}) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const query = useOverCareForWeek(serviceUserId, weekStart ?? '', weekStart != null)
  const d = query.data

  return (
    <Dialog open={weekStart != null} onOpenChange={next => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-2xl" data-testid="over-care-dialog">
        <DialogHeader className="px-6 py-5 pr-12">
          <DialogTitle>Over care taken back</DialogTitle>
          <DialogDescription className="pt-1">
            {weekStart ? `Week of ${formatDate(weekStart)} and the week after.` : null}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 px-6 py-5 text-sm">
          {query.isLoading || !d ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Weekly hours</dt>
                  <dd className="font-medium tabular-nums">{formatMinutes(d.weeklyMinutes)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{d.projected ? 'Care so far + to come' : 'Care given'}</dt>
                  <dd className="font-medium tabular-nums">{formatMinutes(d.careGivenMinutes)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Left out (timebank / approved)</dt>
                  <dd className="font-medium tabular-nums">{formatMinutes(d.excludedMinutes)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Over care</dt>
                  <dd className="font-medium tabular-nums">{formatMinutes(d.overMinutes)}</dd>
                </div>
              </dl>
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                {STATUS_TEXT[d.status]}
                {d.status === 'DONE' || d.status === 'WILL_CANCEL' ? (
                  <>
                    {' '}
                    Week of {formatDate(d.adjustWeekStart)}: {formatMinutes(d.takenBackMinutes)} taken back
                    {d.cancelledMinutes > 0 ? ` (${formatMinutes(d.cancelledMinutes)} of visits)` : ''}
                    {d.notTakenBackMinutes > 0 ? `, ${formatMinutes(d.notTakenBackMinutes)} not taken back (not enough visits left)` : ''}.
                    {d.projected ? ' This week has not finished, so the numbers can change.' : ''}
                  </>
                ) : null}
              </p>
              {d.visits.length ? (
                <ul className="divide-y divide-border rounded-md border border-border text-xs">
                  {d.visits.map(v => (
                    <li key={v.scheduledJobId} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {formatDate(v.date)} · {formatTime(v.start)}–{formatTime(v.end)} · {v.label}
                        </p>
                        <p className="text-muted-foreground">{v.carers.length ? v.carers.join(', ') : 'No carer'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium tabular-nums">{formatMinutes(v.minutes)}</p>
                        <p className="text-muted-foreground">{v.status === 'CANCELLED' ? 'Cancelled' : 'On the rota'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : d.status === 'DONE' || d.status === 'WILL_CANCEL' ? (
                <p className="text-xs text-muted-foreground">No visits need cancelling: the next week is already within the lower hours.</p>
              ) : null}
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
