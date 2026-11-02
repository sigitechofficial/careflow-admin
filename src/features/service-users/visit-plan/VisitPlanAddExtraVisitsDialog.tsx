import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus, UserPlus, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label, Textarea } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { cn, formatDate } from '@/shared/lib/utils'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { formatVisitPlanWeeklyHours } from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import { useMedicationRounds } from '@/features/settings/hooks/useMedicationRounds'
import { sortMedicationRounds } from '@/features/service-users/medication/medication-time-slots'
import type { VisitPlanNightDuty, VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import {
  isNightTimeSlotCode,
  slotTimesCrossMidnight,
  VISIT_PLAN_NIGHT_TYPE_OPTIONS,
} from '@/features/service-users/visit-plan/visit-plan-night-duty.util'
import { VisitPlanCarersCountInput } from '@/features/service-users/visit-plan/VisitPlanCarersCountInput'
import { VisitPlanSlotCarersDialog } from '@/features/service-users/visit-plan/VisitPlanSlotCarersDialog'
import { VISIT_PLAN_MAX_DURATION_MINUTES } from '@/features/service-users/visit-plan/visit-plan-constants'
import { addDaysToIsoDate, todayIsoDate } from '@/features/service-users/visit-plan/visit-plan-generate-rota.util'
import {
  addMinutesToTime,
  durationKeepingEndTime,
  visitDurationMinutes,
} from '@/features/service-users/visit-plan/visit-plan-time.util'
import { formatSlotCarerDisplayRole } from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import {
  previewExtraVisits,
  useAddExtraVisits,
  useEditExtraVisit,
  type VisitPlanDateChange,
} from '@/features/service-users/visit-plan/visit-plan-date-changes.api'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  planId: string
  /** Plan slots — used to offer the service user's usual carers and to drive the carer picker. */
  slots: VisitPlanSlot[]
  usualCarerIds: string[]
  defaultRequiredCarers: number
  /** An extra visit to edit: the date and time slot stay fixed. Adds new visits when left out. */
  editing?: VisitPlanDateChange | null
}

type DateMode = 'single' | 'range' | 'specific'

const DATE_MODES: Array<{ id: DateMode; label: string }> = [
  { id: 'single', label: 'Single date' },
  { id: 'range', label: 'Date range' },
  { id: 'specific', label: 'Specific dates' },
]
const MAX_RANGE_DAYS = 31

function weekdayLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00.000Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })
}

function weekdayIndex(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00.000Z`).getUTCDay()
}

/** Same rule as the server: a window that ends before it starts runs past midnight (e.g. Night 20:00–07:00). */
function timeInWindow(hm: string, windowStart?: string | null, windowEnd?: string | null): boolean {
  if (!windowStart || !windowEnd) return true
  const ws = windowStart.slice(0, 5)
  const we = windowEnd.slice(0, 5)
  if (we > ws) return (hm >= ws && hm < we) || (we >= '23:59' && hm === we)
  return hm >= ws || hm < we
}

function datesInRange(from: string, to: string): string[] {
  if (!from || !to || to < from) return []
  const out: string[] = []
  for (let d = from; d <= to && out.length < MAX_RANGE_DAYS; d = addDaysToIsoDate(d, 1)) out.push(d)
  return out
}

export function VisitPlanAddExtraVisitsDialog({
  open,
  onOpenChange,
  serviceUserId,
  planId,
  slots,
  usualCarerIds,
  defaultRequiredCarers,
  editing = null,
}: Props) {
  const isEditing = Boolean(editing)
  const [mode, setMode] = React.useState<DateMode>('single')
  const [singleDate, setSingleDate] = React.useState('')
  const [rangeFrom, setRangeFrom] = React.useState('')
  const [rangeTo, setRangeTo] = React.useState('')
  const [specificDates, setSpecificDates] = React.useState<string[]>([])
  const [pendingDate, setPendingDate] = React.useState('')
  const [roundCode, setRoundCode] = React.useState('')
  const [startTime, setStartTime] = React.useState('')
  const [duration, setDuration] = React.useState<number | null>(60)
  const [nightDuty, setNightDuty] = React.useState<VisitPlanNightDuty>('NONE')
  const [requiredCarers, setRequiredCarers] = React.useState(defaultRequiredCarers)
  const [employeeIds, setEmployeeIds] = React.useState<string[]>([])
  const [reason, setReason] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [pickerOpen, setPickerOpen] = React.useState(false)

  React.useEffect(() => {
    if (open && editing) {
      setMode('single')
      setSingleDate(editing.date)
      setRoundCode(editing.roundCode ?? '')
      setStartTime(editing.plannedStartTime)
      setDuration(editing.durationMinutes ?? visitDurationMinutes(editing.plannedStartTime, editing.plannedEndTime))
      setNightDuty(editing.nightDuty ?? 'NONE')
      setRequiredCarers(editing.requiredCarers ?? defaultRequiredCarers)
      setEmployeeIds(editing.assignedEmployeeIds)
      setReason(editing.notes)
      setNotes('')
      return
    }
    if (open) {
      setRequiredCarers(defaultRequiredCarers)
      return
    }
    setMode('single')
    setSingleDate('')
    setRangeFrom('')
    setRangeTo('')
    setSpecificDates([])
    setPendingDate('')
    setRoundCode('')
    setStartTime('')
    setDuration(60)
    setNightDuty('NONE')
    setEmployeeIds([])
    setReason('')
    setNotes('')
  }, [open, defaultRequiredCarers, editing])

  const addExtra = useAddExtraVisits(serviceUserId, planId)
  const editExtra = useEditExtraVisit(serviceUserId, planId)
  const saving = addExtra.isPending || editExtra.isPending
  const roundsQuery = useMedicationRounds(open)
  const rounds = React.useMemo(
    () => sortMedicationRounds((roundsQuery.data ?? []).filter((r) => r.isActive)),
    [roundsQuery.data],
  )
  const round = rounds.find((r) => r.code === roundCode) ?? null
  const roundWindow =
    round?.windowStart && round.windowEnd ? `${round.windowStart.slice(0, 5)}–${round.windowEnd.slice(0, 5)}` : null
  const today = todayIsoDate()

  const dates = React.useMemo(() => {
    if (mode === 'single') return singleDate ? [singleDate] : []
    if (mode === 'range') return datesInRange(rangeFrom, rangeTo)
    return [...specificDates].sort()
  }, [mode, singleDate, rangeFrom, rangeTo, specificDates])
  const rangeTooLong =
    mode === 'range' && Boolean(rangeFrom && rangeTo) && rangeTo > addDaysToIsoDate(rangeFrom, MAX_RANGE_DAYS - 1)

  const selectedCarerIds = React.useMemo(() => employeeIds.slice(0, requiredCarers), [employeeIds, requiredCarers])
  const employeeNameById = useEmployeeNameMap(
    React.useMemo(() => [...new Set([...usualCarerIds, ...employeeIds])], [usualCarerIds, employeeIds]),
  )
  const usualNotSelected = usualCarerIds.filter((id) => !selectedCarerIds.includes(id))

  const timeReady = Boolean(round) && /^\d{2}:\d{2}$/.test(startTime) && Boolean(duration && duration > 0)
  const startOutsideSlot =
    Boolean(round) && /^\d{2}:\d{2}$/.test(startTime) && !timeInWindow(startTime, round!.windowStart, round!.windowEnd)
  const ready = dates.length > 0 && timeReady
  /** Shown as soon as start time and duration are set — no need to pick dates first. */
  const endTime = timeReady ? addMinutesToTime(startTime, duration!) : null
  const runsPastMidnight = Boolean(endTime) && slotTimesCrossMidnight(startTime, endTime)
  /** Waking / sleeping night for the Night time slot or a visit that runs past midnight; otherwise a normal visit. */
  const nightTypeAllowed = runsPastMidnight || (Boolean(endTime) && isNightTimeSlotCode(roundCode))
  const effectiveNightDuty: VisitPlanNightDuty = nightTypeAllowed ? nightDuty : 'NONE'
  const nightType = VISIT_PLAN_NIGHT_TYPE_OPTIONS.find((o) => o.value === effectiveNightDuty)
  const payload = React.useMemo(
    () => ({
      dates,
      roundCode,
      startTime,
      durationMinutes: duration ?? 0,
      requiredCarers,
      employeeIds: selectedCarerIds,
      nightDuty: effectiveNightDuty,
      ...(editing ? { editingExceptionId: editing.id } : {}),
    }),
    [dates, roundCode, startTime, duration, requiredCarers, selectedCarerIds, effectiveNightDuty, editing],
  )
  const previewQuery = useQuery({
    queryKey: ['visit-plan-extra-preview', planId, payload],
    enabled: open && ready,
    queryFn: () => previewExtraVisits(serviceUserId, planId, payload),
  })
  const preview = ready ? previewQuery.data : undefined
  const okCount = preview?.dates.filter((d) => d.ok).length ?? 0
  /** Dates whose week would go over the service user's weekly hours: sent to a manager. */
  const approvalCount = preview?.dates.filter((d) => d.ok && d.needsApproval).length ?? 0
  const addCount = okCount - approvalCount
  const limitMinutes =
    preview?.limitWeeklyHours != null ? Math.round(preview.limitWeeklyHours * 60) : null

  // The carer picker suggests carers for a slot; give it the extra visit's own time and weekdays.
  const pickerSlot = React.useMemo<VisitPlanSlot | null>(() => {
    const template = slots[0]
    // Carers can be chosen once the time is set; until dates are picked, every weekday is checked.
    if (!template || !timeReady) return null
    return {
      ...template,
      id: undefined,
      label: round ? `${round.name} (extra)` : 'Extra visit',
      isEnabled: true,
      daysOfWeek: dates.length ? [...new Set(dates.map(weekdayIndex))].sort() : [0, 1, 2, 3, 4, 5, 6],
      plannedStartTime: startTime,
      plannedEndTime: endTime ?? startTime,
      durationMinutes: duration,
      requiredCarers,
      scheduleFrequency: 'DAILY',
      slotKind: 'STANDARD',
      nightDuty: effectiveNightDuty,
      assignedEmployeeIds: selectedCarerIds,
      carerAssignments: selectedCarerIds.map((employeeId, index) => ({
        dayOfWeek: null,
        employeeId,
        role: index === 0 ? ('LEAD' as const) : ('SECONDARY' as const),
        durationMinutes: null,
        plannedStartTime: null,
        plannedEndTime: null,
        sortOrder: index,
      })),
      exceptions: [],
      linkedCarePlanFormIds: [],
    }
  }, [slots, timeReady, endTime, round, dates, startTime, duration, requiredCarers, selectedCarerIds, effectiveNightDuty])

  const addSpecificDate = () => {
    if (!pendingDate) return
    setSpecificDates((prev) => (prev.includes(pendingDate) ? prev : [...prev, pendingDate]))
    setPendingDate('')
  }

  const handleSubmit = async () => {
    if (!dates.length) {
      toastWarning('Choose dates', 'Pick at least one date for the extra visit.')
      return
    }
    if (!round) {
      toastWarning('Choose a time slot', 'Pick the time slot the extra visit belongs to.')
      return
    }
    if (!ready) {
      toastWarning('Set the time', 'Enter a start time and a duration.')
      return
    }
    if (!reason.trim()) {
      toastWarning('Add a reason', 'Say why the extra visit is needed.')
      return
    }
    if (!preview || okCount === 0) {
      toastWarning(
        isEditing ? 'Cannot save' : 'Nothing to add',
        preview?.dates[0]?.message ?? preview?.slotMessage ?? 'None of the chosen dates can take this extra visit.',
      )
      return
    }
    if (editing) {
      try {
        const edited = await editExtra.mutateAsync({
          exceptionId: editing.id,
          payload: {
            startTime,
            durationMinutes: duration ?? 0,
            requiredCarers,
            employeeIds: selectedCarerIds,
            reason: reason.trim(),
            nightDuty: effectiveNightDuty,
          },
        })
        if (edited.message?.startsWith('Not changed yet')) {
          toastWarning('Extra visit not changed yet', `${edited.message}.`)
        } else if (edited.message?.includes('sent to a manager')) {
          toastWarning('Extra visit updated', `${edited.message}.`)
        } else {
          toastSuccess('Extra visit updated', 'The rota visit has been updated. Other visits are not affected.')
        }
        onOpenChange(false)
      } catch (error) {
        toastApiError(error, 'Could not update the extra visit')
        void previewQuery.refetch()
      }
      return
    }
    try {
      const result = await addExtra.mutateAsync({
        ...payload,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        nightDuty: effectiveNightDuty,
      })
      const sent = result.sentForApproval ?? []
      const title = [
        result.created ? `${result.created} extra visit${result.created === 1 ? '' : 's'} added` : null,
        sent.length ? `${sent.length} sent for manager approval` : null,
      ]
        .filter(Boolean)
        .join(' · ')
      const details = [
        sent.length
          ? `Waiting for approval (over the weekly hours): ${sent
              .map((d) => `${weekdayLabel(d.date)} ${formatDate(d.date)}`)
              .join(', ')}. They are added only if a manager approves.`
          : null,
        result.overWeeklyHours?.length
          ? `Over the weekly hours (allowed by settings): ${result.overWeeklyHours
              .map((d) => `${weekdayLabel(d.date)} ${formatDate(d.date)}`)
              .join(', ')}.`
          : null,
        result.carerApprovals?.length
          ? `Carer over their weekly hours — sent to a manager, on the visit once approved: ${result.carerApprovals
              .map((d) => `${weekdayLabel(d.date)} ${formatDate(d.date)}`)
              .join(', ')}.`
          : null,
        result.carerWarnings?.length
          ? `Carer over their weekly hours — on the visit, to be confirmed on the rota: ${result.carerWarnings
              .map((d) => `${weekdayLabel(d.date)} ${formatDate(d.date)}`)
              .join(', ')}.`
          : null,
        result.skipped.length
          ? `${result.skipped.length} date${result.skipped.length === 1 ? ' was' : 's were'} skipped: ${result.skipped
              .map((d) => `${formatDate(d.date)} — ${d.message ?? 'not available'}`)
              .join('; ')}.`
          : null,
        result.created ? 'Created on the rota. Other visits are not affected.' : null,
      ]
        .filter(Boolean)
        .join(' ')
      if (result.carerApprovals?.length || result.carerWarnings?.length) {
        toastWarning(title || 'Nothing added', details)
      } else {
        toastSuccess(title || 'Nothing added', details)
      }
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not add extra visits')
      void previewQuery.refetch()
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit extra visit' : 'Add extra visits'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Change the time, carers or reason. The date and time slot stay the same; it must not clash with another visit.'
                : 'Add a visit outside the regular schedule. It must not clash with another visit.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            {editing ? (
              <section className="space-y-1" data-testid="extra-visit-fixed-date">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <p className="text-sm font-medium text-foreground">
                  {weekdayLabel(editing.date)} {formatDate(editing.date)}
                </p>
                <p className="text-xs text-muted-foreground">
                  To move it to another date, delete this extra visit and add a new one.
                </p>
              </section>
            ) : (
            <section className="space-y-3">
              <Label className="text-xs text-muted-foreground">
                Dates <span className="text-red-600">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {DATE_MODES.map((m) => (
                  <Button
                    key={m.id}
                    type="button"
                    size="sm"
                    variant={mode === m.id ? 'default' : 'outline'}
                    onClick={() => setMode(m.id)}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
              {mode === 'single' ? (
                <Input
                  type="date"
                  className="w-44"
                  min={today}
                  value={singleDate}
                  aria-label="Date"
                  onChange={(e) => setSingleDate(e.target.value)}
                />
              ) : mode === 'range' ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input
                      type="date"
                      className="mt-1 w-44"
                      min={today}
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input
                      type="date"
                      className="mt-1 w-44"
                      min={rangeFrom || today}
                      value={rangeTo}
                      onChange={(e) => setRangeTo(e.target.value)}
                    />
                  </div>
                  <p className="pb-2 text-xs text-muted-foreground">
                    Every day in the range, up to {MAX_RANGE_DAYS} days.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-end gap-2">
                    <Input
                      type="date"
                      className="w-44"
                      min={today}
                      value={pendingDate}
                      aria-label="Date to add"
                      onChange={(e) => setPendingDate(e.target.value)}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={!pendingDate} onClick={addSpecificDate}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add date
                    </Button>
                  </div>
                  {specificDates.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {[...specificDates].sort().map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                        >
                          {weekdayLabel(d)} {formatDate(d)}
                          <button
                            type="button"
                            aria-label={`Remove ${formatDate(d)}`}
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setSpecificDates((prev) => prev.filter((x) => x !== d))}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
              {rangeTooLong ? (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Only the first {MAX_RANGE_DAYS} days of this range will be used.
                </p>
              ) : null}
            </section>
            )}

            <section className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Time slot <span className="text-red-600">*</span>
                  </Label>
                  <Select
                    value={roundCode}
                    disabled={isEditing}
                    onValueChange={(code) => {
                      setRoundCode(code)
                      const next = rounds.find((r) => r.code === code)
                      // Start at the slot's window unless the time already fits it.
                      if (next?.windowStart && !(startTime && timeInWindow(startTime, next.windowStart, next.windowEnd))) {
                        setStartTime(next.windowStart.slice(0, 5))
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1" aria-label="Time slot" data-testid="extra-visit-slot">
                      <SelectValue placeholder="Choose a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {rounds.map((r) => (
                        <SelectItem key={r.code} value={r.code}>
                          {r.name}
                          {r.windowStart && r.windowEnd
                            ? ` (${r.windowStart.slice(0, 5)}–${r.windowEnd.slice(0, 5)})`
                            : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {round ? (
                  <p className="self-end pb-2 text-xs text-muted-foreground">
                    {roundWindow
                      ? `${round.name} runs ${roundWindow}. The visit must start in this window.`
                      : `${round.name} has no time window, so any start time is allowed.`}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="extra-visit-start" className="text-xs text-muted-foreground">
                    Start time <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="extra-visit-start"
                    type="time"
                    className="mt-1"
                    value={startTime}
                    disabled={!round}
                    onChange={(e) => {
                      const next = e.target.value
                      // Keep the end time and recalculate the duration; over 12 hours, keep the duration instead.
                      const keptLength =
                        endTime && next
                          ? durationKeepingEndTime(next, endTime, VISIT_PLAN_MAX_DURATION_MINUTES)
                          : null
                      setStartTime(next)
                      if (keptLength != null) setDuration(keptLength)
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="extra-visit-duration" className="text-xs text-muted-foreground">
                    Duration (mins) <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="extra-visit-duration"
                    type="text"
                    inputMode="numeric"
                    className="mt-1 tabular-nums"
                    value={duration ?? ''}
                    disabled={!round}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw !== '' && !/^\d*$/.test(raw)) return
                      setDuration(raw === '' ? null : Math.min(VISIT_PLAN_MAX_DURATION_MINUTES, Math.max(1, Number(raw))))
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="extra-visit-end" className="text-xs text-muted-foreground">
                    End time
                  </Label>
                  <Input
                    id="extra-visit-end"
                    type="time"
                    className="mt-1"
                    value={endTime ?? ''}
                    disabled={!round || !/^\d{2}:\d{2}$/.test(startTime)}
                    aria-label="End time"
                    onChange={(e) => {
                      // Changing the end time sets the duration; an earlier time means the next morning.
                      const mins = e.target.value ? visitDurationMinutes(startTime, e.target.value) : null
                      if (mins != null && mins > 0) setDuration(Math.min(VISIT_PLAN_MAX_DURATION_MINUTES, mins))
                    }}
                  />
                </div>
              </div>
              {nightTypeAllowed ? (
                <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2" data-testid="extra-visit-night-type">
                  <div>
                    <Label className="text-xs text-muted-foreground">Night type</Label>
                    <Select value={nightDuty} onValueChange={(v) => setNightDuty(v as VisitPlanNightDuty)}>
                      <SelectTrigger className="mt-1" aria-label="Night type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VISIT_PLAN_NIGHT_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="self-end pb-2 text-xs text-muted-foreground">
                    {runsPastMidnight ? 'Ends the next morning. ' : ''}
                    {nightType?.hint}
                  </p>
                </div>
              ) : null}
              {startOutsideSlot && round ? (
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300" data-testid="extra-visit-slot-message">
                  {startTime} is outside {round.name} ({roundWindow}). Choose a start time within the time slot.
                </p>
              ) : preview?.slotMessage ? (
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300" data-testid="extra-visit-slot-message">
                  {preview.slotMessage}
                </p>
              ) : null}
            </section>

            <section className="space-y-3 rounded-lg border border-border bg-muted/20 px-3.5 py-3">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Carers needed</Label>
                  <VisitPlanCarersCountInput
                    className="mt-1 h-9 w-20"
                    value={requiredCarers}
                    aria-label="Carers needed"
                    onCommit={setRequiredCarers}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!pickerSlot}
                  title={pickerSlot ? undefined : 'Choose the time slot, start time and duration first'}
                  onClick={() => setPickerOpen(true)}
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  {selectedCarerIds.length ? 'Change carers' : 'Choose carers'}
                </Button>
                {!pickerSlot ? (
                  <p className="text-xs text-muted-foreground">Choose the time slot, start time and duration to choose carers.</p>
                ) : null}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Carers</Label>
                {selectedCarerIds.length ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {selectedCarerIds.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                      >
                        {employeeNameById.get(id) ?? 'Carer'}
                        {requiredCarers > 1 ? (
                          // The server makes the first chosen carer the lead.
                          <span className="font-semibold" data-testid="extra-visit-carer-role">
                            · {formatSlotCarerDisplayRole(
                              { carerAssignments: [], assignedEmployeeIds: selectedCarerIds, requiredCarers },
                              id,
                            )}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          aria-label={`Remove ${employeeNameById.get(id) ?? 'carer'}`}
                          onClick={() => setEmployeeIds((prev) => prev.filter((x) => x !== id))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    No carer chosen — the visit will be created unallocated.
                  </p>
                )}
              </div>
              {usualNotSelected.length ? (
                <div>
                  <Label className="text-xs text-muted-foreground">Usual carers for this service user</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {usualNotSelected.map((id) => (
                      <Button
                        key={id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-full px-2.5 text-xs"
                        disabled={selectedCarerIds.length >= requiredCarers}
                        onClick={() => setEmployeeIds((prev) => [...prev.filter((x) => x !== id), id])}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        {employeeNameById.get(id) ?? 'Carer'}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <div>
              <Label htmlFor="extra-visit-reason" className="text-xs text-muted-foreground">
                {isEditing ? 'Reason and notes' : 'Reason for extra visit'} <span className="text-red-600">*</span>
              </Label>
              {isEditing ? (
                <Textarea
                  id="extra-visit-reason"
                  className="mt-1 min-h-[64px]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              ) : (
                <Input
                  id="extra-visit-reason"
                  className="mt-1"
                  placeholder="e.g. Family asked for an extra call after hospital discharge"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              )}
            </div>
            {isEditing ? null : (
            <div>
              <Label htmlFor="extra-visit-notes" className="text-xs text-muted-foreground">
                Notes (optional)
              </Label>
              <Textarea
                id="extra-visit-notes"
                className="mt-1 min-h-[64px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            )}

            <section className="rounded-lg border border-border px-3.5 py-3" data-testid="extra-visit-preview">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check before saving</p>
              {!ready ? (
                <p className="mt-2 text-sm text-muted-foreground">Choose the dates, time slot, start time and duration to check for clashes.</p>
              ) : previewQuery.isFetching && !preview ? (
                <p className="mt-2 text-sm text-muted-foreground">Checking…</p>
              ) : preview ? (
                <>
                {approvalCount > 0 ? (
                  <p className="mt-2 rounded-md border border-orange-300 bg-orange-50 px-2.5 py-1.5 text-xs text-orange-900 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-100">
                    {isEditing ? (
                      <>
                        The new time would take that week over the service user&apos;s weekly contracted hours. The
                        change is sent to a manager; the visit keeps its current time until it is approved.
                      </>
                    ) : (
                      <>
                        Dates marked <strong>Needs manager approval</strong> would take that week over the service
                        user&apos;s weekly contracted hours. They are sent to a manager and added only if approved.
                        The other dates are added now.
                      </>
                    )}
                  </p>
                ) : null}
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm">
                  {preview.dates.map((d) => (
                    <li key={d.date} className="flex flex-wrap gap-x-2">
                      <span className="whitespace-nowrap font-medium">
                        {weekdayLabel(d.date)} {formatDate(d.date)}
                      </span>
                      <span
                        className={cn(
                          !d.ok
                            ? 'text-amber-700 dark:text-amber-300'
                            : d.needsApproval || d.overWeeklyHours
                              ? 'font-medium text-orange-700 dark:text-orange-300'
                              : 'text-emerald-700 dark:text-emerald-300',
                        )}
                      >
                        {d.ok && d.overWeeklyHours
                          ? `${isEditing ? 'Can be saved' : 'Will be added'} — over the weekly contracted hours: ${
                              d.message ?? ''
                            }`
                          : d.ok && d.needsApproval
                          ? `Needs manager approval — that week would have ${formatVisitPlanWeeklyHours(
                              d.weekMinutes ?? 0,
                            )} of ${formatVisitPlanWeeklyHours(limitMinutes ?? 0)}${
                              isEditing ? '. The visit keeps its current time until a manager approves' : ''
                            }`
                          : d.ok
                          ? isEditing
                            ? 'No clash — can be saved'
                            : 'Will be added'
                          : d.overWeeklyHours
                          ? `${isEditing ? "Can't be saved" : "Can't be added"} — over the weekly contracted hours: ${
                              d.message ?? ''
                            }`
                          : `Skipped: ${d.message ?? 'not available'}${
                              d.clashEmployeeIds.length
                                ? ` (${d.clashEmployeeIds.map((id) => employeeNameById.get(id) ?? 'Carer').join(', ')})`
                                : ''
                            }`}
                      </span>
                      {d.ok && d.carerOverHours?.length ? (
                        <span
                          className="w-full pl-2 text-xs text-orange-700 dark:text-orange-300"
                          data-testid="extra-visit-carer-hours"
                        >
                          {d.carerOverHours
                            .map(
                              (c) =>
                                `${c.message} — ${
                                  c.outcome === 'MANAGER_APPROVAL'
                                    ? editing
                                      ? 'sent to a manager; the visit keeps its current time and carers until approved'
                                      : 'sent to a manager; not on this visit until approved'
                                    : 'on the visit, to be confirmed on the rota'
                                }`,
                            )
                            .join('. ')}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                </>
              ) : null}
            </section>
          </DialogBody>
          <DialogFooter className="border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving || okCount === 0}
              data-testid="extra-visit-submit"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEditing
                ? 'Save changes'
                : approvalCount > 0
                  ? [
                      addCount > 0 ? `Add ${addCount} visit${addCount === 1 ? '' : 's'}` : null,
                      `Send ${approvalCount} for approval`,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : `Add ${okCount > 0 ? okCount : ''} visit${okCount === 1 ? '' : 's'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {pickerSlot ? (
        <VisitPlanSlotCarersDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          serviceUserId={serviceUserId}
          slot={pickerSlot}
          dialogTitle="Choose carers for the extra visit"
          dialogDescription={`Pick up to ${requiredCarers} carer${requiredCarers === 1 ? '' : 's'} for ${startTime}–${endTime ?? ''}.`}
          onChange={(ids) => setEmployeeIds(ids)}
        />
      ) : null}
    </>
  )
}
