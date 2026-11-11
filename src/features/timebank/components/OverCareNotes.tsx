import * as React from 'react'
import { Info, Loader2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
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
import { formatMinutes } from '@/features/timebank/timebank-format'

/**
 * Info tag where over care shows (docs/SU_OVER_CARE_ADJUST_PLAN.md): the week's over care and its
 * review (Workforce › Over care reviews: pending, action taken or no action needed), with "See
 * visits". On a week whose hours were lowered for an earlier week's over care, it says so instead.
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

  let text: string | null = null
  if (adjustment) {
    if (adjustment.reviewStatus === 'PENDING') text = 'Over care given — waiting for a manager to review it'
    else if (adjustment.reviewStatus === 'NO_ACTION_NEEDED') text = 'Over care given — reviewed, no action needed'
    else
      text =
        `Over care given — ${formatMinutes(adjustment.takenBackMinutes)} taken back` +
        (adjustment.adjustWeekStart ? ` from the week of ${formatDate(adjustment.adjustWeekStart)}` : '') +
        ` (${adjustment.cancelledVisits} visit${adjustment.cancelledVisits === 1 ? '' : 's'} cancelled)` +
        (adjustment.notTakenBackMinutes > 0 ? `; ${formatMinutes(adjustment.notTakenBackMinutes)} not taken back` : '')
  } else if (overMinutes > 0 && setting) {
    if (setting.from && weekStart < setting.from) text = null
    else if (weekStart >= currentWeekStart) text = 'Over care so far — a manager review is raised once the week ends'
    else text = 'Over care given — a manager review will be raised by the weekly check'
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
  DONE: 'Action taken: these visits were cancelled (no charge). Each visit has the reason.',
  PENDING_REVIEW: 'Waiting for a manager to review it. Nothing has been cancelled.',
  NO_ACTION: 'Reviewed: no action needed. Nothing was cancelled.',
  WILL_REVIEW: 'A manager review is raised by the weekly check once the week has finished. Nothing is cancelled by itself.',
  NOTHING: 'No over care, once hours paid from the timebank are left out.',
  NOT_ELIGIBLE: 'This week is before over care started being checked.',
}

/** "See visits": the week's over care, its review and the visits cancelled for it. */
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
          <DialogTitle>Over care</DialogTitle>
          <DialogDescription className="pt-1">
            {weekStart ? `Week of ${formatDate(weekStart)}.` : null}
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
                  <dt className="text-muted-foreground">Paid from timebank</dt>
                  <dd className="font-medium tabular-nums">{formatMinutes(d.excludedMinutes)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Over care</dt>
                  <dd className="font-medium tabular-nums">{formatMinutes(d.overMinutes)}</dd>
                </div>
              </dl>
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                {STATUS_TEXT[d.status]}
                {d.status === 'DONE' ? (
                  <>
                    {' '}
                    {formatMinutes(d.takenBackMinutes)} taken back
                    {d.cancelledMinutes > 0 ? ` (${formatMinutes(d.cancelledMinutes)} of visits)` : ''}
                    {d.notTakenBackMinutes > 0 ? `, ${formatMinutes(d.notTakenBackMinutes)} not taken back` : ''}.
                  </>
                ) : null}
                {d.projected ? ' This week has not finished, so the numbers can change.' : ''}
                {d.decisionNote ? (
                  <span className="mt-1 block text-muted-foreground">
                    {d.status === 'NO_ACTION' ? 'Reason' : 'Note'}: {d.decisionNote}
                  </span>
                ) : null}
                {d.reviewId ? (
                  <Link
                    to="/over-care-reviews"
                    search={{ tab: d.status === 'PENDING_REVIEW' ? 'pending' : d.status === 'DONE' ? 'action-taken' : 'no-action-needed' }}
                    className="mt-1 block font-medium text-primary underline"
                  >
                    Open in Over care reviews
                  </Link>
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
