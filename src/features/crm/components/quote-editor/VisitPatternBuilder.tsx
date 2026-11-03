import * as React from 'react'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { cn, formatDate } from '@/shared/lib/utils'
import { toastError } from '@/shared/lib/toast'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useMedicationRounds } from '@/features/settings/hooks/useMedicationRounds'
import { sortMedicationRounds, type MedicationRoundLookup } from '@/features/service-users/medication/medication-time-slots'
import { roundVisual } from '@/features/service-users/visit-tasks/visit-task-planner-visual.util'
import { VisitPlanCarersCountInput } from '@/features/service-users/visit-plan/VisitPlanCarersCountInput'
import {
  FREQUENCY_LABELS,
  NIGHT_DUTY_LABELS,
  OVER_HOURS_TITLE,
  clockSpan,
  dayRatesNote,
  hoursUsedMessage,
  money,
  overHoursMessage,
  overWeeklyHours,
  visitBasePrice,
  weeklyVisitMinutes,
} from '@/features/crm/quote-labels'
import type {
  QuoteNightDuty,
  QuotePatternFrequency,
  QuotePatternInput,
  QuotePricing,
  QuoteRates,
} from '@/features/crm/types/quotation.types'

const selectClass = 'mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm'

/** One price, or the lowest–highest when weekend / bank holiday rates make the days differ. */
function perVisitText(priced: QuotePricing['patterns'][number] | undefined): string {
  if (!priced) return '—'
  if (priced.chargePerOccurrence != null) return `${money(priced.chargePerOccurrence)} per visit`
  const amounts = priced.occurrences.map(o => o.amount).filter((a): a is number => a != null)
  if (!amounts.length) return '—'
  return `${money(Math.min(...amounts))}–${money(Math.max(...amounts))} per visit`
}
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Problems the server will also report; shown early so staff can fix them while typing. */
export function patternProblems(p: QuotePatternInput): string[] {
  const out: string[] = []
  if (!p.label.trim()) out.push('Add a label')
  if (p.frequency === 'ONE_OFF' ? !(p.oneOffDates ?? []).length : !p.daysOfWeek.length) {
    out.push(p.frequency === 'ONE_OFF' ? 'Add the visit date' : 'Choose at least one day')
  }
  if (!p.windowEndTime && p.endTime && clockSpan(p.startTime, p.endTime) !== p.durationMinutes) {
    out.push(`${p.startTime}–${p.endTime} is ${clockSpan(p.startTime, p.endTime)} min but the duration is ${p.durationMinutes} min`)
  }
  if (p.windowEndTime && p.windowEndTime <= p.startTime) out.push('The time window must end after it starts')
  if (p.effectiveFrom && p.effectiveTo && p.effectiveTo < p.effectiveFrom) out.push('Effective to is before effective from')
  return out
}

const hmToMin = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5))
const minToHm = (m: number) => {
  const v = ((m % 1440) + 1440) % 1440
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}
const endOf = (p: QuotePatternInput) => p.endTime ?? minToHm(hmToMin(p.startTime) + p.durationMinutes)

/** The time slot a visit belongs to: the slot whose window holds its start time, else the nearest slot. */
export function roundFor(p: QuotePatternInput, rounds: MedicationRoundLookup[]): MedicationRoundLookup | null {
  if (!rounds.length) return null
  const start = hmToMin(p.startTime)
  const inWindow = rounds.find(r => {
    if (!r.windowStart || !r.windowEnd) return false
    const from = hmToMin(r.windowStart)
    const to = hmToMin(r.windowEnd)
    return from <= to ? start >= from && start < to : start >= from || start < to
  })
  if (inWindow) return inWindow
  const distance = (r: MedicationRoundLookup) => {
    const t = hmToMin(r.time ?? r.windowStart ?? '00:00')
    const d = Math.abs(t - start)
    return Math.min(d, 1440 - d)
  }
  return [...rounds].sort((a, b) => distance(a) - distance(b))[0]!
}

function daysSummary(p: QuotePatternInput): string {
  if (p.frequency === 'ONE_OFF') {
    const dates = p.oneOffDates ?? []
    return dates.length ? `One-off · ${dates.map(d => formatDate(d)).join(', ')}` : 'One-off · no date set'
  }
  if (!p.daysOfWeek.length) return 'No days chosen'
  const days = p.daysOfWeek.length === 7 ? 'Every day' : MONDAY_FIRST.filter(d => p.daysOfWeek.includes(d)).map(d => DAY_LABELS[d]).join(', ')
  return p.frequency === 'WEEKLY' ? days : `${days} · ${FREQUENCY_LABELS[p.frequency].toLowerCase()}`
}

function datesSummary(p: QuotePatternInput): string | null {
  if (p.frequency === 'ONE_OFF') return null
  if (p.effectiveFrom && p.effectiveTo) return `${formatDate(p.effectiveFrom)} to ${formatDate(p.effectiveTo)}`
  if (p.effectiveTo) return `Until ${formatDate(p.effectiveTo)}`
  if (p.effectiveFrom) return `From ${formatDate(p.effectiveFrom)}`
  return null
}

/** Add or edit one visit; changes reach the quote on "Add visit" / "Done". Same layout as the visit plan. */
function VisitDialog({
  open,
  onOpenChange,
  mode,
  visit,
  hourlyRate,
  rates,
  hoursProblem,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  visit: QuotePatternInput | null
  hourlyRate: number | null
  rates: QuoteRates | null
  /** Why this visit can't be kept: it takes the visits past the hours per week. */
  hoursProblem: (visit: QuotePatternInput) => string | null
  onDone: (visit: QuotePatternInput) => void
}) {
  const [draft, setDraft] = React.useState<QuotePatternInput | null>(visit)
  const [error, setError] = React.useState<string | null>(null)
  const [oneOff, setOneOff] = React.useState('')
  React.useEffect(() => {
    if (!open) return
    setDraft(visit)
    setError(null)
    setOneOff('')
    // Snapshot the visit only when the dialog opens.
  }, [open])
  if (!draft) return null

  const patch = (changes: Partial<QuotePatternInput>) => {
    setError(null)
    setDraft(prev => (prev ? { ...prev, ...changes } : prev))
  }
  const isOneOff = draft.frequency === 'ONE_OFF'
  const end = endOf(draft)
  const overnight = end <= draft.startTime
  const price = visitBasePrice({ ...draft, nightDuty: overnight ? draft.nightDuty : 'NONE' }, hourlyRate, rates)
  const dayNote = dayRatesNote(rates)

  const handleDone = () => {
    const problems = patternProblems({ ...draft, endTime: end })
    const overHours = problems.length ? null : hoursProblem({ ...draft, endTime: end })
    if (problems.length || overHours) {
      setError(problems[0] ?? overHours)
      if (overHours) toastError(OVER_HOURS_TITLE, overHours)
      return
    }
    onDone({ ...draft, endTime: end, windowEndTime: null, manualChargePerVisit: null, overrideReason: null })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add visit' : 'Edit visit'} — {draft.label || 'Visit'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? 'A visit that repeats on the days you choose.' : 'Change when this visit happens.'} Priced at the quote’s hourly rate.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="quote-visit-label" className="text-xs text-muted-foreground">Visit name (shown on the quote)</Label>
              <Input id="quote-visit-label" className="mt-1" value={draft.label} onChange={e => patch({ label: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="quote-visit-often" className="text-xs text-muted-foreground">How often</Label>
              <select
                id="quote-visit-often"
                className={selectClass}
                value={draft.frequency}
                onChange={e => patch({ frequency: e.target.value as QuotePatternFrequency })}
              >
                {(Object.keys(FREQUENCY_LABELS) as QuotePatternFrequency[]).map(f => <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>)}
              </select>
            </div>
          </div>

          {isOneOff ? (
            <section>
              <Label className="text-xs text-muted-foreground">Visit dates</Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {(draft.oneOffDates ?? []).map(d => (
                  <span key={d} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                    {formatDate(d)}
                    <button type="button" aria-label={`Remove ${d}`} onClick={() => patch({ oneOffDates: (draft.oneOffDates ?? []).filter(x => x !== d) })}>×</button>
                  </span>
                ))}
                <Input type="date" className="w-40" aria-label="Visit date" value={oneOff} onChange={e => setOneOff(e.target.value)} />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!oneOff}
                  onClick={() => {
                    patch({ oneOffDates: [...new Set([...(draft.oneOffDates ?? []), oneOff])].sort() })
                    setOneOff('')
                  }}
                >
                  Add date
                </Button>
              </div>
            </section>
          ) : (
            <>
              <section>
                <Label className="text-xs text-muted-foreground">Days of the week</Label>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-2">
                  {MONDAY_FIRST.map(day => (
                    <label key={day} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={draft.daysOfWeek.includes(day)}
                        onCheckedChange={() =>
                          patch({
                            daysOfWeek: draft.daysOfWeek.includes(day)
                              ? draft.daysOfWeek.filter(d => d !== day)
                              : [...draft.daysOfWeek, day].sort(),
                          })
                        }
                        aria-label={DAY_LABELS[day]}
                      />
                      {DAY_LABELS[day]}
                    </label>
                  ))}
                </div>
              </section>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="quote-visit-from" className="text-xs text-muted-foreground">Start date (optional)</Label>
                  <Input id="quote-visit-from" type="date" className="mt-1" value={draft.effectiveFrom ?? ''} onChange={e => patch({ effectiveFrom: e.target.value || null })} />
                  {!draft.effectiveFrom && <p className="mt-1 text-xs text-muted-foreground">Leave empty to start with the care.</p>}
                </div>
                <div>
                  <Label htmlFor="quote-visit-to" className="text-xs text-muted-foreground">End date (optional)</Label>
                  <Input id="quote-visit-to" type="date" className="mt-1" value={draft.effectiveTo ?? ''} onChange={e => patch({ effectiveTo: e.target.value || null })} />
                </div>
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label htmlFor="quote-visit-start" className="text-xs text-muted-foreground">Start time</Label>
              <Input
                id="quote-visit-start"
                type="time"
                className="mt-1"
                value={draft.startTime}
                onChange={e => {
                  const startTime = e.target.value
                  if (!startTime) return
                  // Keep the length; the end time moves with the start.
                  patch({ startTime, endTime: minToHm(hmToMin(startTime) + draft.durationMinutes) })
                }}
              />
            </div>
            <div>
              <Label htmlFor="quote-visit-duration" className="text-xs text-muted-foreground">Duration (mins)</Label>
              <Input
                id="quote-visit-duration"
                type="text"
                inputMode="numeric"
                className="mt-1 tabular-nums"
                value={draft.durationMinutes || ''}
                onFocus={e => e.currentTarget.select()}
                onChange={e => {
                  const raw = e.target.value
                  if (raw !== '' && !/^\d*$/.test(raw)) return
                  const durationMinutes = raw === '' ? 0 : Math.min(1440, Math.max(1, Number(raw)))
                  patch({ durationMinutes, endTime: minToHm(hmToMin(draft.startTime) + durationMinutes) })
                }}
              />
            </div>
            <div>
              <Label htmlFor="quote-visit-end" className="text-xs text-muted-foreground">End time{overnight ? ' (next day)' : ''}</Label>
              <Input
                id="quote-visit-end"
                type="time"
                className="mt-1"
                value={end}
                onChange={e => {
                  const endTime = e.target.value
                  if (!endTime) return
                  patch({ endTime, durationMinutes: clockSpan(draft.startTime, endTime) })
                }}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Carers needed</Label>
              <VisitPlanCarersCountInput
                className="mt-1 h-9 w-full"
                value={draft.carersPerVisit}
                aria-label="Carers needed"
                onCommit={carersPerVisit => patch({ carersPerVisit })}
              />
            </div>
          </div>

          {overnight && (
            <section className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2" data-testid="quote-visit-night-type">
              <div>
                <Label htmlFor="quote-visit-night" className="text-xs text-muted-foreground">Night type</Label>
                <select
                  id="quote-visit-night"
                  className={selectClass}
                  value={draft.nightDuty ?? 'NONE'}
                  onChange={e => patch({ nightDuty: e.target.value as QuoteNightDuty })}
                >
                  {(Object.keys(NIGHT_DUTY_LABELS) as QuoteNightDuty[]).map(n => <option key={n} value={n}>{NIGHT_DUTY_LABELS[n]}</option>)}
                </select>
              </div>
              <p className="self-end pb-2 text-xs text-muted-foreground">Ends the next morning.</p>
            </section>
          )}

          <section className="rounded-lg border border-border bg-muted/20 px-3.5 py-3 text-sm" data-testid="quote-visit-price">
            <Label className="text-xs text-muted-foreground">Price per visit</Label>
            <p className="mt-1">
              {price != null ? (
                <>
                  <span className="font-semibold">{money(price.amount)}</span>
                  <span className="text-muted-foreground"> = {price.how}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Set the hourly rate above the visits to see the price.</span>
              )}
            </p>
            {price != null && dayNote && (
              <p className="mt-0.5 text-xs text-muted-foreground">On a weekday. On those days: {dayNote}.</p>
            )}
          </section>

          {error && (
            <p className="text-sm font-medium text-destructive" role="alert" data-testid="quote-visit-error">
              {error}
            </p>
          )}
        </DialogBody>
        <DialogFooter className="border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleDone} data-testid="quote-visit-done">{mode === 'add' ? 'Add visit' : 'Done'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Quote visits grouped by time slot, laid out like the service user's visit plan: each slot has
 * its own "Add visit", each visit one row with Edit and Remove; visits open in a dialog.
 */
export function VisitPatternBuilder({
  patterns,
  onChange,
  readOnly,
  pricing,
  hourlyRate = null,
  rates = null,
  focusIndex,
  focusKey,
  hoursPerWeek = null,
}: {
  patterns: QuotePatternInput[]
  onChange: (next: QuotePatternInput[]) => void
  readOnly: boolean
  pricing: QuotePricing | null
  /** £ per carer per hour, for the price shown in the visit dialog. */
  hourlyRate?: number | null
  /** The quote's other rates, for the price shown in the visit dialog. */
  rates?: QuoteRates | null
  /** Visit to open (e.g. from the problem list); focusKey changes on every request. */
  focusIndex?: number
  focusKey?: number
  /** The enquiry's hours per week: the visits can't add up to more. */
  hoursPerWeek?: number | null
}) {
  const { data: roundRows = [] } = useMedicationRounds()
  const rounds = React.useMemo(() => sortMedicationRounds(roundRows.filter(r => r.isActive !== false)), [roundRows])
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  const [editing, setEditing] = React.useState<{ mode: 'add' | 'edit'; index: number; visit: QuotePatternInput } | null>(null)

  React.useEffect(() => {
    if (focusIndex == null || !patterns[focusIndex]) return
    setEditing({ mode: 'edit', index: focusIndex, visit: patterns[focusIndex]! })
    // Open only when asked (focusKey), not when the visit list changes.
  }, [focusIndex, focusKey])

  const groups = React.useMemo(() => {
    const byRound = new Map<string, number[]>()
    patterns.forEach((p, i) => {
      const code = roundFor(p, rounds)?.code ?? 'ALL'
      byRound.set(code, [...(byRound.get(code) ?? []), i])
    })
    for (const list of byRound.values()) list.sort((a, b) => patterns[a]!.startTime.localeCompare(patterns[b]!.startTime))
    const list: Array<{ code: string; name: string; window: string | null; round: MedicationRoundLookup | null; indexes: number[] }> = rounds.map(r => ({
      code: r.code,
      name: r.name,
      window: r.windowStart && r.windowEnd ? `${r.windowStart}–${r.windowEnd}` : null,
      round: r,
      indexes: byRound.get(r.code) ?? [],
    }))
    if (!rounds.length) list.push({ code: 'ALL', name: 'Visits', window: null, round: null, indexes: byRound.get('ALL') ?? [] })
    return list
  }, [patterns, rounds])

  const full = hoursPerWeek != null && weeklyVisitMinutes(patterns) >= hoursPerWeek * 60
  const hoursProblem = (visit: QuotePatternInput, index: number) => {
    const total = weeklyVisitMinutes([...patterns.filter((_, j) => j !== index), visit])
    return hoursPerWeek != null && overWeeklyHours(total, hoursPerWeek)
      ? `${overHoursMessage(total, hoursPerWeek)} Make the visit shorter or take away some days.`
      : null
  }

  const toggle = (code: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })

  const addVisit = (round: MedicationRoundLookup | null) => {
    if (full) {
      toastError(OVER_HOURS_TITLE, hoursUsedMessage(hoursPerWeek!))
      return
    }
    const startTime = (round?.windowStart ?? round?.time ?? '08:00').slice(0, 5)
    const visit: QuotePatternInput = {
      label: round?.name ?? 'Visit',
      careType: '',
      startTime,
      endTime: minToHm(hmToMin(startTime) + 30),
      windowEndTime: null,
      durationMinutes: 30,
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      frequency: 'WEEKLY',
      effectiveFrom: null,
      effectiveTo: null,
      oneOffDates: [],
      carersPerVisit: 1,
      nightDuty: 'NONE',
      activities: [],
      notes: '',
      manualChargePerVisit: null,
      overrideReason: null,
    }
    setEditing({ mode: 'add', index: patterns.length, visit })
  }

  return (
    <div className="space-y-3" data-testid="quote-visit-patterns">
      {groups.map(group => {
        const isCollapsed = collapsed.has(group.code)
        const visual = roundVisual(group.code)
        const RoundIcon = visual.icon
        return (
          <div key={group.code} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" data-testid={`quote-slot-${group.code}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-muted/30 px-4 py-3">
              <button type="button" onClick={() => toggle(group.code)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={!isCollapsed}>
                {isCollapsed ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1', visual.surfaceClass, visual.ringClass)}>
                  <RoundIcon className={cn('h-4 w-4', visual.iconClass)} aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-sm font-semibold text-foreground">{group.name}</h4>
                    {group.window && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{group.window}</span>}
                    {group.indexes.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">{group.indexes.length}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isCollapsed
                      ? `Hidden · ${group.indexes.length} visit${group.indexes.length === 1 ? '' : 's'}`
                      : group.indexes.length > 0
                        ? `${group.indexes.length} visit${group.indexes.length === 1 ? '' : 's'} quoted`
                        : 'No visit added yet'}
                  </p>
                </div>
              </button>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1 rounded-lg border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => addVisit(group.round)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add visit
                </Button>
              )}
            </div>

            {!isCollapsed &&
              (group.indexes.length === 0 ? (
                readOnly ? (
                  <p className="px-4 py-4 text-xs text-muted-foreground">No visit in this time slot.</p>
                ) : (
                  <button type="button" onClick={() => addVisit(group.round)} className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-primary/5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Plus className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {full ? `No visit added — the ${hoursPerWeek} contracted hours a week are used.` : 'No visit added yet — add the first one for this time slot.'}
                    </span>
                  </button>
                )
              ) : (
                <ul className="divide-y divide-border/70">
                  {group.indexes.map(i => {
                    const p = patterns[i]!
                    const priced = pricing?.patterns[i]
                    const dates = datesSummary(p)
                    const problems = [...new Set([...patternProblems(p), ...(priced?.issues ?? [])])]
                    return (
                      <li key={i} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 hover:bg-muted/40" data-testid={`quote-visit-${i}`}>
                        <div className="w-32 shrink-0">
                          <p className="text-sm font-semibold tabular-nums text-foreground">{p.startTime}–{endOf(p)}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.durationMinutes} mins{p.nightDuty && p.nightDuty !== 'NONE' ? ` · ${NIGHT_DUTY_LABELS[p.nightDuty]}` : ''}
                          </p>
                        </div>
                        <div className="min-w-[10rem] flex-1">
                          <p className="text-sm text-foreground">{daysSummary(p)}</p>
                          <p className="text-xs text-muted-foreground">{[p.label, dates].filter(Boolean).join(' · ')}</p>
                        </div>
                        <div className="min-w-[10rem] flex-1">
                          <p className="text-sm text-foreground">
                            {perVisitText(priced)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.carersPerVisit} carer{p.carersPerVisit === 1 ? '' : 's'} needed
                            {priced ? ` · ${money(p.frequency === 'ONE_OFF' ? priced.oneOffTotal : priced.weeklyTotal)}${p.frequency === 'ONE_OFF' ? ' one-off' : ' / week'}` : ''}
                          </p>
                        </div>
                        {!readOnly && (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setEditing({ mode: 'edit', index: i, visit: p })}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-destructive hover:text-destructive"
                              aria-label={`Remove ${p.label || 'visit'} at ${p.startTime}`}
                              onClick={() => onChange(patterns.filter((_, j) => j !== i))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        {problems.length > 0 && (
                          <p className="basis-full text-xs text-amber-700 dark:text-amber-300">{problems.join(' · ')}</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ))}
          </div>
        )
      })}

      <VisitDialog
        open={editing != null}
        onOpenChange={open => !open && setEditing(null)}
        mode={editing?.mode ?? 'add'}
        visit={editing?.visit ?? null}
        hourlyRate={hourlyRate}
        rates={rates}
        hoursProblem={visit => hoursProblem(visit, editing?.mode === 'edit' ? editing.index : -1)}
        onDone={visit => {
          if (!editing) return
          onChange(editing.mode === 'add' ? [...patterns, visit] : patterns.map((p, j) => (j === editing.index ? visit : p)))
        }}
      />
    </div>
  )
}
