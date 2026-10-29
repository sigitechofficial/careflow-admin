import * as React from 'react'
import { CheckCircle2, Clock, Loader2, PlusCircle, XCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { Label, Textarea } from '@/shared/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
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
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import {
  addDaysToOperationalIso as addDays,
  dayKeyFromInstant,
  operationalTodayIso,
} from '@/shared/lib/operational-day.util'
import {
  useCancelExtraWeeklyHours,
  useExtraWeeklyHours,
  useExtraWeeklyHoursPreview,
  useGrantExtraWeeklyHours,
} from '@/features/hours-approvals/hooks'
import type { ExtraHoursOutcome, ExtraHoursPeriod, ExtraWeeklyHours } from '@/features/hours-approvals/types'
import { formatHours } from '@/features/hours-approvals/components/ContractedHoursImpactSummary'

/** Permission to give or cancel extra weekly hours. */
export const EXTRA_HOURS_PERMISSION = 'employees.extra_hours.manage'

const PERIODS: { id: ExtraHoursPeriod; label: string }[] = [
  { id: 'DAY', label: 'One day' },
  { id: 'WEEK', label: 'One week' },
  { id: 'RANGE', label: 'Date range' },
]

/** Monday (YYYY-MM-DD) of the week a day is in. */
function mondayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const offset = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
  return addDays(iso, -offset)
}

/** The waiting requests adding the hours approved, and those still over. */
export function ExtraHoursOutcomeList({ outcome }: { outcome: ExtraHoursOutcome }) {
  const { formatDate } = useOrganisationDisplayFormat()
  const nothing = !outcome.approved.length && !outcome.stillOver.length && !outcome.failed.length
  if (nothing) {
    return <p className="text-xs text-muted-foreground">No requests were waiting for a manager in these weeks.</p>
  }
  return (
    <div className="space-y-2 text-xs">
      {outcome.approved.length ? (
        <div>
          <p className="font-medium text-emerald-700 dark:text-emerald-400">
            Approved now ({outcome.approved.length}) — the carer is on these visits
          </p>
          <ul className="mt-1 space-y-0.5 px-3">
            {outcome.approved.map(a => (
              <li key={a.approvalId} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                {a.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {outcome.stillOver.length ? (
        <div>
          <p className="font-medium text-amber-700 dark:text-amber-400">
            Still waiting ({outcome.stillOver.length}) — still over the weekly hours
          </p>
          <ul className="mt-1 space-y-0.5 px-3">
            {outcome.stillOver.map(a => (
              <li key={a.approvalId} className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                {a.label} — {formatHours(a.shortHours)} short (week of {formatDate(a.weekStart)})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {outcome.failed.length ? (
        <div>
          <p className="font-medium text-destructive">Could not be approved ({outcome.failed.length})</p>
          <ul className="mt-1 space-y-0.5 px-3">
            {outcome.failed.map(a => (
              <li key={a.approvalId} className="flex items-start gap-1.5">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
                <span>
                  {a.label} — {a.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

type DialogProps = {
  open: boolean
  onClose: () => void
  employeeId: string
  employeeName?: string | null
  contractedHours?: number | null
  /** A day in the week to start with (e.g. the request's week on Hours approvals). */
  defaultDate?: string | null
}

/** "Mon 26 Oct" for a YYYY-MM-DD day. */
function shortDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

function weekLabel(monday: string): string {
  return `${shortDay(monday)} – ${shortDay(addDays(monday, 6))}`
}

/** Mondays of the weeks the days from `start` to `end` touch. */
function weeksBetween(start: string, end: string): string[] {
  const out: string[] = []
  for (let w = mondayOf(start); w <= end && out.length < 60; w = addDays(w, 7)) out.push(w)
  return out
}

type WeekChoice = 'THIS' | 'NEXT' | 'AFTER' | 'OTHER'

/** How many weeks "Another week" offers after the three listed. */
const OTHER_WEEKS = 8

/** Add extra weekly hours for a day, a week or a date range; shows which waiting requests it approved. */
export function AddExtraHoursDialog({
  open,
  onClose,
  employeeId,
  employeeName,
  contractedHours,
  defaultDate,
}: DialogProps) {
  const grant = useGrantExtraWeeklyHours()
  const history = useExtraWeeklyHours(employeeId, open)
  const today = operationalTodayIso()
  const thisMonday = mondayOf(today)
  const weekStarts: Record<Exclude<WeekChoice, 'OTHER'>, string> = {
    THIS: thisMonday,
    NEXT: addDays(thisMonday, 7),
    AFTER: addDays(thisMonday, 14),
  }
  /** "Another week": the 8 weeks after the three listed. */
  const otherFrom = addDays(thisMonday, 21)
  const otherWeeks = Array.from({ length: OTHER_WEEKS }, (_, i) => addDays(otherFrom, i * 7))

  const [period, setPeriod] = React.useState<ExtraHoursPeriod>('WEEK')
  const [weekChoice, setWeekChoice] = React.useState<WeekChoice>('THIS')
  const [otherDate, setOtherDate] = React.useState('')
  const [day, setDay] = React.useState('')
  const [rangeFrom, setRangeFrom] = React.useState('')
  const [rangeTo, setRangeTo] = React.useState('')
  const [hours, setHours] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [outcome, setOutcome] = React.useState<ExtraHoursOutcome | null>(null)

  React.useEffect(() => {
    if (!open) return
    const start = defaultDate && defaultDate >= thisMonday ? defaultDate : today
    const startMonday = mondayOf(start)
    const listed = (Object.entries(weekStarts) as [WeekChoice, string][]).find(([, m]) => m === startMonday)
    setPeriod('WEEK')
    setWeekChoice(listed ? listed[0] : 'OTHER')
    setOtherDate(listed ? '' : startMonday)
    setDay(start)
    setRangeFrom(start)
    setRangeTo(start)
    setHours('')
    setReason('')
    setOutcome(null)
  }, [open, defaultDate])

  const extraHours = Number(hours)
  const hoursValid = Number.isFinite(extraHours) && extraHours > 0
  const shownExtra = hoursValid ? Math.round(extraHours * 100) / 100 : 0

  /** The dates sent, and the weeks they raise. */
  const chosen = React.useMemo((): { startDate: string; endDate?: string; weeks: string[] } | null => {
    if (period === 'DAY') return day ? { startDate: day, weeks: [mondayOf(day)] } : null
    if (period === 'RANGE') {
      if (!rangeFrom || !rangeTo || rangeTo < rangeFrom) return null
      return { startDate: rangeFrom, endDate: rangeTo, weeks: weeksBetween(rangeFrom, rangeTo) }
    }
    // Another week: the date picked is the week's Monday (weeks run Monday to Sunday).
    const monday =
      weekChoice === 'OTHER'
        ? otherWeeks.includes(otherDate)
          ? otherDate
          : ''
        : weekStarts[weekChoice]
    return monday ? { startDate: monday, weeks: [monday] } : null
  }, [period, day, rangeFrom, rangeTo, weekChoice, otherDate, thisMonday, otherFrom, otherWeeks])

  // Live preview of the waiting requests, a moment after the last change.
  const previewInput =
    open && !outcome && hoursValid && chosen
      ? {
          employeeId,
          periodType: period,
          startDate: chosen.startDate,
          endDate: chosen.endDate,
          extraHours,
        }
      : null
  const previewKey = previewInput ? JSON.stringify(previewInput) : ''
  const [debouncedInput, setDebouncedInput] = React.useState<typeof previewInput>(null)
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedInput(previewKey ? JSON.parse(previewKey) : null), 300)
    return () => window.clearTimeout(t)
  }, [previewKey])
  const preview = useExtraWeeklyHoursPreview(debouncedInput)
  const previewCurrent = Boolean(debouncedInput) && JSON.stringify(debouncedInput) === previewKey

  /** Extra hours already given for a week (active ones add up). */
  const givenFor = (monday: string) =>
    (history.data ?? [])
      .filter(r => !r.cancelledAt && weeksBetween(r.startDate, r.endDate).includes(monday))
      .reduce((sum, r) => sum + r.extraHours, 0)

  const limitLine = (monday: string) => {
    const given = givenFor(monday)
    const base = contractedHours ?? 0
    const parts = [`${formatHours(base)}`]
    if (given) parts.push(`${formatHours(given)} already given`)
    parts.push(`${formatHours(shownExtra)} extra`)
    return `limit ${parts.join(' + ')} = ${formatHours(base + given + shownExtra)}`
  }

  const sending = grant.isPending

  const submit = async () => {
    if (!hoursValid) {
      toastWarning('Enter the extra hours', 'Type how many extra hours to add for that week (for example 2 or 2.5).')
      return
    }
    if (!chosen) {
      toastWarning('Choose the dates', 'Pick the day, week or date range for the extra hours.')
      return
    }
    try {
      const res = await grant.mutateAsync({
        employeeId,
        periodType: period,
        startDate: chosen.startDate,
        endDate: chosen.endDate,
        extraHours,
        reason: reason.trim() || undefined,
      })
      toastSuccess('Extra hours added', res.message)
      setOutcome(res.outcome)
    } catch (e) {
      toastApiError(e, 'Could not add extra hours')
    }
  }

  const weekOption = (choice: WeekChoice, title: string, detail: React.ReactNode) => {
    const selected = weekChoice === choice
    return (
      <button
        key={choice}
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={sending}
        onClick={() => setWeekChoice(choice)}
        className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
          selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40'
        }`}
      >
        <span
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            selected ? 'border-primary' : 'border-muted-foreground/60'
          }`}
          aria-hidden
        >
          {selected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{title}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
      </button>
    )
  }

  const daysLeft = Math.round(
    (Date.parse(`${addDays(thisMonday, 6)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  ) + 1
  const thisWeekNote = chosen?.weeks[0] === thisMonday && today > thisMonday

  return (
    <Dialog open={open} onOpenChange={next => (!next && !sending ? onClose() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" aria-hidden />
            Add extra hours{employeeName ? ` — ${employeeName}` : ''}
          </DialogTitle>
          <DialogDescription>
            {contractedHours != null ? `Contracted: ${formatHours(contractedHours)} a week. ` : ''}
            Extra hours raise the weekly limit for the week you pick and apply straight away.
          </DialogDescription>
        </DialogHeader>
        {outcome ? (
          <DialogBody className="space-y-3">
            <p className="text-sm font-medium text-foreground">Extra hours added. Requests that were waiting:</p>
            <ExtraHoursOutcomeList outcome={outcome} />
          </DialogBody>
        ) : (
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label>For</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Extra hours period">
                {PERIODS.map(p => (
                  <Button
                    key={p.id}
                    type="button"
                    size="sm"
                    variant={period === p.id ? 'default' : 'outline'}
                    role="radio"
                    aria-checked={period === p.id}
                    onClick={() => setPeriod(p.id)}
                    disabled={sending}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {period === 'WEEK' ? (
              <div className="space-y-1.5">
                <Label>Which week</Label>
                <div className="space-y-1.5" role="radiogroup" aria-label="Which week">
                  {weekOption(
                    'THIS',
                    'This week',
                    today > thisMonday
                      ? `${weekLabel(thisMonday)} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left (${shortDay(today)} – ${shortDay(addDays(thisMonday, 6))})`
                      : weekLabel(thisMonday),
                  )}
                  {weekOption('NEXT', 'Next week', weekLabel(weekStarts.NEXT))}
                  {weekOption('AFTER', 'Week after', weekLabel(weekStarts.AFTER))}
                  {weekOption(
                    'OTHER',
                    'Another week',
                    otherDate && weekChoice === 'OTHER' && chosen
                      ? weekLabel(otherDate)
                      : `${weekLabel(otherFrom)} up to ${weekLabel(otherWeeks[otherWeeks.length - 1]!)}`,
                  )}
                </div>
                {weekChoice === 'OTHER' ? (
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="extra-hours-other-week">Choose the week</Label>
                    <Select value={otherDate} onValueChange={setOtherDate} disabled={sending}>
                      <SelectTrigger id="extra-hours-other-week" className="h-9 w-64">
                        <SelectValue placeholder="Choose a week" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherWeeks.map(w => (
                          <SelectItem key={w} value={w}>
                            {weekLabel(w)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ) : null}

            {period === 'DAY' ? (
              <div className="space-y-1.5">
                <Label htmlFor="extra-hours-day">Day</Label>
                <Input
                  id="extra-hours-day"
                  type="date"
                  value={day}
                  onChange={e => setDay(e.target.value)}
                  disabled={sending}
                  className="w-44"
                />
              </div>
            ) : null}

            {period === 'RANGE' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="extra-hours-from">From</Label>
                  <Input
                    id="extra-hours-from"
                    type="date"
                    value={rangeFrom}
                    onChange={e => setRangeFrom(e.target.value)}
                    disabled={sending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="extra-hours-to">To</Label>
                  <Input
                    id="extra-hours-to"
                    type="date"
                    value={rangeTo}
                    min={rangeFrom || undefined}
                    onChange={e => setRangeTo(e.target.value)}
                    disabled={sending}
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="extra-hours-value">
                {period === 'RANGE' ? 'Extra hours for each week' : 'Extra hours for that week'}
              </Label>
              <Input
                id="extra-hours-value"
                type="number"
                inputMode="decimal"
                min={0.25}
                step={0.5}
                placeholder="2"
                value={hours}
                onChange={e => setHours(e.target.value)}
                disabled={sending}
                className="w-36"
              />
            </div>

            {chosen ? (
              <div className="rounded-md bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                {chosen.weeks.length > 1 ? (
                  <p className="mb-1">
                    This range touches {chosen.weeks.length} weeks ({shortDay(chosen.weeks[0]!)} –{' '}
                    {shortDay(addDays(chosen.weeks[chosen.weeks.length - 1]!, 6))}).
                    {hoursValid ? ` Each week gets +${formatHours(shownExtra)}.` : ' Each week gets the extra hours.'}
                  </p>
                ) : null}
                {period === 'DAY' ? (
                  <p className="font-medium">
                    {shortDay(chosen.startDate)}: the week {weekLabel(chosen.weeks[0]!)} — {limitLine(chosen.weeks[0]!)}
                  </p>
                ) : (
                  <ul className="space-y-0.5 font-medium">
                    {chosen.weeks.map(w => (
                      <li key={w}>
                        {weekLabel(w)}: {limitLine(w)}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1">
                  {thisWeekNote
                    ? 'Visits already done this week still count towards it.'
                    : chosen.weeks.length > 1
                      ? 'Applies to every visit in those weeks.'
                      : 'Applies to every visit that week.'}
                </p>
              </div>
            ) : null}

            {previewInput ? (
              <div className="space-y-1.5 rounded-md border border-border px-3 py-2.5 text-xs" data-testid="extra-hours-preview">
                <p className="font-medium text-foreground">
                  {previewCurrent && preview.data?.blockedMessage
                    ? "Can't add these hours"
                    : `Waiting requests in ${chosen && chosen.weeks.length > 1 ? 'these weeks' : 'this week'}`}
                </p>
                {!previewCurrent || preview.isFetching ? (
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Checking…
                  </p>
                ) : preview.isError ? (
                  <p className="text-muted-foreground">Couldn&apos;t check the waiting requests.</p>
                ) : preview.data?.blockedMessage ? (
                  <p className="text-destructive">{preview.data.blockedMessage}</p>
                ) : preview.data &&
                  !preview.data.willApprove.length &&
                  !preview.data.stillOver.length &&
                  !preview.data.wontApprove.length ? (
                  <p className="text-muted-foreground">No requests are waiting for this carer in {chosen && chosen.weeks.length > 1 ? 'these weeks' : 'this week'}.</p>
                ) : preview.data ? (
                  <ul className="space-y-1">
                    {preview.data.willApprove.map(a => (
                      <li key={a.approvalId} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                        <span>
                          {a.label} —{' '}
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            will be approved and the carer put on the visit
                          </span>
                        </span>
                      </li>
                    ))}
                    {preview.data.wontApprove.map(a => (
                      <li key={a.approvalId} className="flex items-start gap-1.5">
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
                        <span>
                          {a.label} —{' '}
                          <span className="font-medium text-destructive">
                            won&apos;t be approved: {a.message}
                          </span>
                        </span>
                      </li>
                    ))}
                    {preview.data.stillOver.map(a => (
                      <li key={a.approvalId} className="flex items-start gap-1.5">
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                        <span>
                          {a.label} —{' '}
                          <span className="font-medium text-amber-700 dark:text-amber-400">
                            still {formatHours(a.shortHours)} short, stays waiting
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="extra-hours-reason">Reason (optional)</Label>
              <Textarea
                id="extra-hours-reason"
                rows={2}
                maxLength={1000}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Holiday cover for another carer"
                disabled={sending}
              />
            </div>
          </DialogBody>
        )}
        <DialogFooter>
          {outcome ? (
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void submit()} disabled={sending}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {hoursValid ? `Add ${formatHours(shownExtra)} extra` : 'Add extra hours'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** "Add extra hours" button with its dialog; hidden without the permission. */
export function AddExtraHoursButton({
  className,
  label = 'Add extra hours',
  ...props
}: Omit<DialogProps, 'open' | 'onClose'> & { className?: string; label?: string }) {
  const canManage = useAuthStore(s => s.can(EXTRA_HOURS_PERMISSION))
  const [open, setOpen] = React.useState(false)
  if (!canManage) return null
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={className ?? 'h-7 px-2 text-xs'}
        onClick={() => setOpen(true)}
      >
        <PlusCircle className="mr-1 h-3.5 w-3.5" aria-hidden />
        {label}
      </Button>
      <AddExtraHoursDialog {...props} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

const PERIOD_LABEL: Record<ExtraHoursPeriod, string> = { DAY: 'Day', WEEK: 'Week', RANGE: 'Date range' }

/** Every extra weekly hours given to the carer: who, when, how many; cancel one given by mistake. */
export function ExtraHoursHistory({ employeeId }: { employeeId: string }) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const formatDateTime = (iso: string) => {
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : '—'
  }
  const canManage = useAuthStore(s => s.can(EXTRA_HOURS_PERMISSION))
  const query = useExtraWeeklyHours(employeeId)
  const cancel = useCancelExtraWeeklyHours()
  const [toCancel, setToCancel] = React.useState<ExtraWeeklyHours | null>(null)
  const [cancelReason, setCancelReason] = React.useState('')
  const rows = query.data ?? []
  const active = rows.filter(r => !r.cancelledAt)

  const confirmCancel = async () => {
    if (!toCancel) return
    try {
      await cancel.mutateAsync({ id: toCancel.id, reason: cancelReason.trim() || undefined })
      toastSuccess('Extra hours cancelled', 'Requests already approved stay approved.')
      setToCancel(null)
      setCancelReason('')
    } catch (e) {
      toastApiError(e, 'Could not cancel extra hours')
    }
  }

  if (query.isLoading) {
    return <p className="text-xs text-muted-foreground">Loading extra hours…</p>
  }
  if (!rows.length) {
    return <p className="text-xs text-muted-foreground">No extra hours given yet.</p>
  }
  return (
    <div className="space-y-2" data-testid="extra-hours-history">
      <p className="text-xs text-muted-foreground">
        Given {rows.length} time{rows.length === 1 ? '' : 's'} ({active.length} active).
      </p>
      <ul className="divide-y divide-border rounded-md border border-border text-xs">
        {rows.map(r => (
          <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">
                +{formatHours(r.extraHours)}
                {r.periodType === 'RANGE' ? ' a week' : ''} · {PERIOD_LABEL[r.periodType]}{' '}
                {r.startDate === r.endDate
                  ? formatDate(r.startDate)
                  : `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`}
                {r.periodType === 'RANGE'
                  ? (() => {
                      const n = weeksBetween(r.startDate, r.endDate).length
                      return ` · ${n} week${n === 1 ? '' : 's'}`
                    })()
                  : ''}
              </p>
              <p className="text-muted-foreground">
                Given by {r.grantedByName ?? '—'} on {formatDateTime(r.grantedAt)}
                {r.reason ? ` · ${r.reason}` : ''}
              </p>
              {r.outcome?.approved.length ? (
                <p className="text-muted-foreground">
                  Approved {r.outcome.approved.length} waiting request{r.outcome.approved.length === 1 ? '' : 's'}
                </p>
              ) : null}
              {r.cancelledAt ? (
                <p className="text-muted-foreground">
                  Cancelled by {r.cancelledByName ?? '—'} on {formatDateTime(r.cancelledAt)}
                  {r.cancelReason ? ` · ${r.cancelReason}` : ''}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={r.cancelledAt ? 'secondary' : 'success'}>{r.cancelledAt ? 'Cancelled' : 'Active'}</Badge>
              {canManage && !r.cancelledAt ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => setToCancel(r)}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <AlertDialog open={Boolean(toCancel)} onOpenChange={next => (!next && !cancel.isPending ? setToCancel(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel these extra hours?</AlertDialogTitle>
            <AlertDialogDescription>
              The week&apos;s limit goes back without them. Requests they already approved stay approved, and the
              record is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="extra-hours-cancel-reason">Reason (optional)</Label>
            <Textarea
              id="extra-hours-cancel-reason"
              rows={2}
              maxLength={1000}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Added for the wrong week"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancel.isPending}>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                void confirmCancel()
              }}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancel extra hours
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
