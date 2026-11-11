import * as React from 'react'
import { AlertTriangle, CalendarClock, ChevronRight, Loader2, UserRound } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Label, Textarea } from '@/shared/ui/form-field'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { formatMinutes } from '@/features/timebank/timebank-format'
import {
  useCancelOverCareVisits,
  useMarkOverCareNoAction,
  useOverCareReview,
} from '@/features/over-care-reviews/hooks'
import type {
  OverCareReviewDetail,
  OverCareReviewStatus,
  OverCareUpcomingVisit,
} from '@/features/over-care-reviews/types'

export const OVER_CARE_STATUS_LABEL: Record<OverCareReviewStatus, string> = {
  PENDING: 'Pending',
  ACTION_TAKEN: 'Action taken',
  NO_ACTION_NEEDED: 'No action needed',
}

export const OVER_CARE_STATUS_BADGE: Record<OverCareReviewStatus, React.ComponentProps<typeof Badge>['variant']> = {
  PENDING: 'warning',
  ACTION_TAKEN: 'success',
  NO_ACTION_NEEDED: 'secondary',
}

const KIND_LABEL: Record<OverCareUpcomingVisit['kind'], string | null> = {
  PLAN: null,
  EXTRA: 'Extra visit',
  SPECIAL: 'Special visit',
}

/**
 * Care on the visit that can't simply be missed (shown per visit; never blocks the cancel): a
 * medicine due, a critical task or a time-critical task. Going over the over care is shown once,
 * as a total, not per visit.
 */
function careChecks(v: OverCareUpcomingVisit): string[] {
  return [
    ...(v.checks.medicationDue ? ['Medication due'] : []),
    ...v.checks.criticalTasks.map(t => `Critical task: ${t}`),
    ...v.checks.timeCriticalTasks.map(t => (t === 'Time-critical visit' ? t : `Time-critical task: ${t}`)),
  ]
}

type Props = {
  reviewId: string | null
  canManage: boolean
  onClose: () => void
}

export function OverCareReviewDialog({ reviewId, canManage, onClose }: Props) {
  const { data, isLoading, isError } = useOverCareReview(reviewId)
  return (
    <Dialog open={Boolean(reviewId)} onOpenChange={o => (!o ? onClose() : undefined)}>
      <DialogContent size="xl" data-testid="over-care-review-dialog">
        {isLoading || !data ? (
          <>
            <DialogHeader>
              <DialogTitle>Over care review</DialogTitle>
            </DialogHeader>
            <DialogBody>
              {isError ? (
                <p className="text-sm text-destructive">Couldn&apos;t load this review.</p>
              ) : (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Loading review…
                </div>
              )}
            </DialogBody>
          </>
        ) : data.status === 'PENDING' ? (
          <PendingReview review={data} canManage={canManage} onClose={onClose} />
        ) : (
          <DecidedReview review={data} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReviewHeader({ review }: { review: OverCareReviewDetail }) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  return (
    <DialogHeader>
      <div className="flex flex-wrap items-center gap-2">
        <DialogTitle>Over care review — {review.serviceUser.name}</DialogTitle>
        <Badge variant={OVER_CARE_STATUS_BADGE[review.status]} size="sm">
          {OVER_CARE_STATUS_LABEL[review.status]}
        </Badge>
      </div>
      <DialogDescription>
        Raised {formatDate(review.raisedAt.slice(0, 10))} {formatTime(review.raisedAt)} by {review.raisedBy.name}
      </DialogDescription>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm" data-testid="over-care-links">
        <Link
          to="/service-users/$serviceUserId/view"
          params={{ serviceUserId: review.serviceUser.id }}
          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
        >
          <UserRound className="h-3.5 w-3.5" aria-hidden />
          Service user overview
        </Link>
        <Link
          to="/reports/timebank/$serviceUserId"
          params={{ serviceUserId: review.serviceUser.id }}
          search={{ week: review.weekStart }}
          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
        >
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Timebank for the week of {formatDate(review.weekStart)}
        </Link>
      </div>
    </DialogHeader>
  )
}

function SummaryTiles({ review }: { review: OverCareReviewDetail }) {
  const { formatDate } = useOrganisationDisplayFormat()
  const tile = 'rounded-lg bg-muted/50 px-3 py-2'
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="over-care-summary">
      <div className={tile}>
        <p className="text-xs text-muted-foreground">Week of</p>
        <p className="text-base font-semibold tabular-nums">{formatDate(review.weekStart)}</p>
      </div>
      <div className={tile}>
        <p className="text-xs text-muted-foreground">Weekly hours</p>
        <p className="text-base font-semibold tabular-nums">{formatMinutes(review.weeklyMinutes)}</p>
      </div>
      <div className={tile}>
        <p className="text-xs text-muted-foreground">Care given</p>
        <p className="text-base font-semibold tabular-nums">{formatMinutes(review.careGivenMinutes)}</p>
      </div>
      <div className="rounded-lg bg-amber-100 px-3 py-2 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
        <p className="text-xs">Over care</p>
        <p className="text-base font-semibold tabular-nums">{formatMinutes(review.overMinutes)}</p>
      </div>
      {review.excludedMinutes > 0 ? (
        <p className="col-span-full text-xs text-muted-foreground">
          {formatMinutes(review.excludedMinutes)} over the weekly hours is left out: paid from the service
          user&apos;s timebank.
        </p>
      ) : null}
    </div>
  )
}

function OverWeekVisits({ review }: { review: OverCareReviewDetail }) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  if (!review.overWeekVisits.length) return null
  return (
    <details className="group rounded-lg border border-border" data-testid="over-care-why">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium">
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden />
        Care given in the week of {formatDate(review.weekStart)} ({review.overWeekVisits.length} visits)
      </summary>
      <ul className="divide-y divide-border border-t border-border text-sm">
        {review.overWeekVisits.map(v => {
          const longer = v.givenMinutes - v.plannedMinutes
          return (
            <li key={v.jobId} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                {formatDate(v.day)} · {formatTime(v.start)}
                {v.end ? `–${formatTime(v.end)}` : ''} · {v.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {v.chargeableCancellation ? (
                  <Badge variant="outline" size="sm" className="mr-1.5">
                    Late cancellation, charged
                  </Badge>
                ) : null}
                {formatMinutes(v.givenMinutes)}
                {longer > 0 && !v.chargeableCancellation ? (
                  <span className="ml-1.5 text-amber-700 dark:text-amber-300">+{formatMinutes(longer)} longer</span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

function PendingReview({
  review,
  canManage,
  onClose,
}: {
  review: OverCareReviewDetail
  canManage: boolean
  onClose: () => void
}) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [note, setNote] = React.useState('')
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [noActionOpen, setNoActionOpen] = React.useState(false)
  const cancelMut = useCancelOverCareVisits()

  const allVisits = React.useMemo(() => review.upcomingWeeks.flatMap(w => w.visits), [review.upcomingWeeks])
  const chosen = allVisits.filter(v => selected.has(v.scheduledJobId))
  const chosenMinutes = chosen.reduce((s, v) => s + v.minutes, 0)

  const toggle = (ids: string[], on: boolean) =>
    setSelected(prev => {
      const next = new Set(prev)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })

  async function confirmCancel() {
    try {
      await cancelMut.mutateAsync({
        id: review.id,
        scheduledJobIds: chosen.map(v => v.scheduledJobId),
        note: note.trim() || undefined,
      })
      toastSuccess(
        'Visits cancelled',
        `${chosen.length} visit${chosen.length === 1 ? '' : 's'} cancelled for ${review.serviceUser.name}. Carers were told.`,
      )
      setConfirmOpen(false)
      onClose()
    } catch (e) {
      toastApiError(e, 'Could not cancel the visits')
    }
  }

  const needCheck = chosen.filter(v => careChecks(v).length > 0).length
  const cancelDiff = chosenMinutes - review.overMinutes

  return (
    <>
      <ReviewHeader review={review} />
      {canManage ? (
        // Outside the scrolling body, so it stays in view while visits are chosen.
        <SelectionBar overMinutes={review.overMinutes} visits={chosen.length} selectedMinutes={chosenMinutes} />
      ) : null}
      <DialogBody className="space-y-4">
        <SummaryTiles review={review} />
        <OverWeekVisits review={review} />

        <div className="space-y-2">
          <p className="text-sm font-medium">
            Upcoming visits{canManage ? ' — choose any to cancel' : ''}
          </p>
          {review.upcomingWeeks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              No upcoming rota visits that can be cancelled.
            </p>
          ) : (
            review.upcomingWeeks.map((week, i) => {
              const ids = week.visits.map(v => v.scheduledJobId)
              const picked = ids.filter(id => selected.has(id))
              const all = picked.length === ids.length && ids.length > 0
              const pickedMinutes = week.visits
                .filter(v => selected.has(v.scheduledJobId))
                .reduce((s, v) => s + v.minutes, 0)
              return (
                <details
                  key={week.weekStart}
                  open={i === 0}
                  className="group rounded-lg border border-border"
                  data-testid={`over-care-week-${week.weekStart}`}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-muted/40 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden />
                      {canManage ? (
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          aria-label={`Select every visit in the week of ${formatDate(week.weekStart)}`}
                          checked={all}
                          ref={el => {
                            if (el) el.indeterminate = picked.length > 0 && !all
                          }}
                          onClick={e => e.stopPropagation()}
                          onChange={e => toggle(ids, e.target.checked)}
                        />
                      ) : null}
                      Week of {formatDate(week.weekStart)}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {picked.length
                        ? `${picked.length} of ${ids.length} selected · ${formatMinutes(pickedMinutes)}`
                        : `${ids.length} visit${ids.length === 1 ? '' : 's'} · ${formatMinutes(week.minutes)}`}
                    </span>
                  </summary>
                  <ul className="divide-y divide-border border-t border-border">
                    {week.visits.map(v => {
                      const reasons = careChecks(v)
                      return (
                        <li key={v.scheduledJobId}>
                          <label className="flex cursor-pointer items-start justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/30">
                            <span className="flex items-start gap-2">
                              {canManage ? (
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 accent-primary"
                                  checked={selected.has(v.scheduledJobId)}
                                  onChange={e => toggle([v.scheduledJobId], e.target.checked)}
                                />
                              ) : null}
                              <span className="space-y-1">
                                <span className="block">
                                  {formatDate(v.date)} · {formatTime(v.start)}–{formatTime(v.end)} · {v.label}
                                  {v.carers.length ? (
                                    <span className="text-muted-foreground"> · {v.carers.join(', ')}</span>
                                  ) : (
                                    <span className="text-muted-foreground"> · no carer yet</span>
                                  )}
                                </span>
                                <span className="flex flex-wrap gap-1">
                                  {KIND_LABEL[v.kind] ? (
                                    <Badge variant="outline" size="sm">
                                      {KIND_LABEL[v.kind]}
                                    </Badge>
                                  ) : null}
                                  {reasons.map(r => (
                                    <Badge key={r} variant="warning" size="sm">
                                      {r}
                                    </Badge>
                                  ))}
                                </span>
                              </span>
                            </span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">{formatMinutes(v.minutes)}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </details>
              )
            })
          )}
        </div>

        {canManage ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="over-care-note">Note (optional)</Label>
              <Textarea
                id="over-care-note"
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Agreed with the family"
              />
              <p className="text-xs text-muted-foreground">
                Added to the reason on each cancelled visit. No charge; carers on these visits are told.
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">You can view this review. A manager decides what to do.</p>
        )}
      </DialogBody>
      <DialogFooter className="justify-between">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        {canManage ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setNoActionOpen(true)}>
              No action needed
            </Button>
            <Button
              type="button"
              disabled={!chosen.length}
              onClick={() => setConfirmOpen(true)}
              data-testid="over-care-cancel-visits"
            >
              Cancel {chosen.length || ''} visit{chosen.length === 1 ? '' : 's'}
            </Button>
          </div>
        ) : null}
      </DialogFooter>

      <AlertDialog open={confirmOpen} onOpenChange={o => (!cancelMut.isPending ? setConfirmOpen(o) : undefined)}>
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-2xl" data-testid="over-care-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancel {chosen.length} visit{chosen.length === 1 ? '' : 's'} for {review.serviceUser.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Over care, the hours being cancelled, and any visit with care that can&apos;t be missed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-3 gap-2" data-testid="over-care-confirm-summary">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Over care</p>
              <p className="text-base font-semibold tabular-nums">{formatMinutes(review.overMinutes)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Cancelling</p>
              <p className="text-base font-semibold tabular-nums">{formatMinutes(chosenMinutes)}</p>
            </div>
            <div
              className={cn(
                'rounded-lg px-3 py-2',
                cancelDiff > 0 ? 'bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100' : 'bg-muted/50',
              )}
            >
              <p className={cn('text-xs', cancelDiff > 0 ? '' : 'text-muted-foreground')}>
                {cancelDiff > 0 ? 'More than over care' : cancelDiff < 0 ? 'Less than over care' : 'Difference'}
              </p>
              <p className="text-base font-semibold tabular-nums">
                {cancelDiff === 0 ? 'None' : formatMinutes(Math.abs(cancelDiff))}
              </p>
            </div>
          </div>
          <p className="text-sm">
            {needCheck ? (
              <>
                <span className="font-medium">
                  {needCheck} visit{needCheck === 1 ? '' : 's'}
                </span>{' '}
                {needCheck === 1 ? 'has' : 'have'} care that can&apos;t be missed — check {needCheck === 1 ? 'it' : 'them'}{' '}
                first.
              </>
            ) : (
              <span className="text-muted-foreground">No medication or critical tasks on these visits.</span>
            )}
          </p>
          <ul className="grid max-h-[45vh] overflow-y-auto rounded-lg border border-border text-sm sm:grid-cols-2">
            {[...chosen]
              .sort((a, b) => a.start.localeCompare(b.start))
              .map(v => {
                const reasons = careChecks(v)
                return (
                  <li
                    key={v.scheduledJobId}
                    className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 sm:odd:border-r"
                  >
                    <span className="min-w-0 truncate">
                      {formatDate(v.date)} · {formatTime(v.start)}–{formatTime(v.end)} · {v.label}
                    </span>
                    {reasons.length ? (
                      <span className="flex shrink-0 flex-wrap justify-end gap-1">
                        {reasons.map(r => (
                          <Badge key={r} variant="destructive" size="sm">
                            {r}
                          </Badge>
                        ))}
                      </span>
                    ) : null}
                  </li>
                )
              })}
          </ul>
          <p className="text-xs text-muted-foreground">
            Only these dates are cancelled; the visit plan stays the same. No charge. Carers on these visits get a
            &quot;Visit cancelled&quot; notification.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMut.isPending}>Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelMut.isPending}
              onClick={e => {
                e.preventDefault()
                void confirmCancel()
              }}
              data-testid="over-care-confirm-cancel"
            >
              {cancelMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Yes, cancel {chosen.length} visit{chosen.length === 1 ? '' : 's'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NoActionDialog
        open={noActionOpen}
        review={review}
        onClose={() => setNoActionOpen(false)}
        onDone={() => {
          setNoActionOpen(false)
          onClose()
        }}
      />
    </>
  )
}

/** Over care vs what is selected to cancel, always in view at the top of the review. */
function SelectionBar({
  overMinutes,
  visits,
  selectedMinutes,
}: {
  overMinutes: number
  visits: number
  selectedMinutes: number
}) {
  const diff = selectedMinutes - overMinutes
  const tone =
    diff > 0
      ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100'
      : visits && diff === 0
        ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
        : 'border-border bg-muted/40'
  const message = !visits
    ? 'Choose the visits to cancel'
    : diff > 0
      ? `${formatMinutes(diff)} more than the over care`
      : diff === 0
        ? 'Same as the over care'
        : `${formatMinutes(-diff)} less than the over care`
  return (
    <div
      className={cn('flex flex-wrap items-center gap-x-6 gap-y-1 border-b px-5 py-2.5 text-sm', tone)}
      data-testid="over-care-selected-total"
    >
      <span>
        Over care <span className="font-semibold tabular-nums">{formatMinutes(overMinutes)}</span>
      </span>
      <span>
        Selected{' '}
        <span className="font-semibold tabular-nums">{visits ? formatMinutes(selectedMinutes) : '0'}</span>
        <span className="text-xs opacity-80">
          {' '}
          ({visits} visit{visits === 1 ? '' : 's'})
        </span>
      </span>
      <span className="ml-auto flex items-center gap-1 text-xs font-medium">
        {diff > 0 ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> : null}
        {message}
      </span>
    </div>
  )
}

function NoActionDialog({
  open,
  review,
  onClose,
  onDone,
}: {
  open: boolean
  review: OverCareReviewDetail
  onClose: () => void
  onDone: () => void
}) {
  const [reason, setReason] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const mut = useMarkOverCareNoAction()

  React.useEffect(() => {
    if (open) {
      setReason('')
      setError(null)
    }
  }, [open])

  async function save() {
    if (!reason.trim()) {
      setError('Enter a reason')
      return
    }
    try {
      await mut.mutateAsync({ id: review.id, reason: reason.trim() })
      toastSuccess('Saved', `No action needed for ${review.serviceUser.name}.`)
      onDone()
    } catch (e) {
      toastApiError(e, 'Could not save')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={o => (!o && !mut.isPending ? onClose() : undefined)}>
      <AlertDialogContent data-testid="over-care-no-action">
        <AlertDialogHeader>
          <AlertDialogTitle>Mark as no action needed</AlertDialogTitle>
          <AlertDialogDescription>
            Nothing is cancelled. The reason is kept on the review.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1">
          <Label htmlFor="over-care-no-action-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="over-care-no-action-reason"
            rows={3}
            value={reason}
            onChange={e => {
              setReason(e.target.value)
              if (error) setError(null)
            }}
            aria-invalid={Boolean(error)}
            className={error ? 'border-destructive' : undefined}
            placeholder="Extra care was needed after a hospital discharge, agreed with the care coordinator"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mut.isPending}>Back</AlertDialogCancel>
          <AlertDialogAction
            disabled={mut.isPending}
            onClick={e => {
              e.preventDefault()
              void save()
            }}
            data-testid="over-care-no-action-save"
          >
            {mut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Save
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DecidedReview({ review, onClose }: { review: OverCareReviewDetail; onClose: () => void }) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const when = (iso: string | null) => (iso ? `${formatDate(iso.slice(0, 10))} ${formatTime(iso)}` : '—')
  return (
    <>
      <ReviewHeader review={review} />
      <DialogBody className="space-y-4">
        <SummaryTiles review={review} />
        <RecordSection title="Request" testId="over-care-record-request">
          <RecordRow label="Raised on">{when(review.raisedAt)}</RecordRow>
          <RecordRow label="Raised by">{review.raisedBy.name}</RecordRow>
        </RecordSection>
        {review.status === 'ACTION_TAKEN' ? (
          <RecordSection title="Action taken" testId="over-care-record-action">
            <RecordRow label="Cancelled by">{review.decidedBy?.name ?? '—'}</RecordRow>
            <RecordRow label="Cancelled on">{when(review.decidedAt)}</RecordRow>
            <RecordRow label="Visits cancelled">
              {review.cancelledVisits.length} visit{review.cancelledVisits.length === 1 ? '' : 's'} ·{' '}
              {formatMinutes(review.cancelledMinutes)}
            </RecordRow>
            <RecordRow label="Over care taken back">
              {formatMinutes(review.takenBackMinutes)}
              {review.notTakenBackMinutes > 0 ? ` · ${formatMinutes(review.notTakenBackMinutes)} not taken back` : ''}
            </RecordRow>
            <RecordRow label="Note">{review.decisionNote || '—'}</RecordRow>
          </RecordSection>
        ) : (
          <RecordSection title="No action needed" testId="over-care-record-no-action">
            <RecordRow label="Decided by">{review.decidedBy?.name ?? '—'}</RecordRow>
            <RecordRow label="Decided on">{when(review.decidedAt)}</RecordRow>
            <RecordRow label="Reason">{review.decisionNote || '—'}</RecordRow>
          </RecordSection>
        )}
        {review.cancelledVisits.length ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">Cancelled visits</p>
            <ul className="divide-y divide-border rounded-lg border border-border text-sm">
              {review.cancelledVisits.map(v => (
                <li key={v.scheduledJobId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span>
                    {formatDate(v.date)} · {formatTime(v.start)}–{formatTime(v.end)} · {v.label}
                    {v.carers.length ? <span className="text-muted-foreground"> · {v.carers.join(', ')}</span> : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{formatMinutes(v.minutes)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <OverWeekVisits review={review} />
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </>
  )
}

function RecordSection({ title, testId, children }: { title: string; testId: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1" data-testid={testId}>
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="divide-y divide-border rounded-lg border border-border px-3 text-sm">{children}</div>
    </section>
  )
}

function RecordRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap">{children}</span>
    </div>
  )
}
