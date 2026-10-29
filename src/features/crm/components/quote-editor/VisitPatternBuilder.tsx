import * as React from 'react'
import { ChevronDown, Copy, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  FREQUENCY_LABELS,
  NIGHT_DUTY_LABELS,
  WEEKDAYS,
  clockSpan,
  emptyPattern,
  hours,
  money,
} from '@/features/crm/quote-labels'
import type {
  QuoteNightDuty,
  QuotePatternFrequency,
  QuotePatternInput,
  QuotePricing,
} from '@/features/crm/types/quotation.types'

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
const labelClass = 'text-sm font-medium text-foreground'

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}

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
  if (p.manualChargePerVisit != null && !p.overrideReason?.trim()) out.push('Give a reason for the own price')
  return out
}

function PatternEditor({
  pattern,
  onChange,
  readOnly,
  priced,
}: {
  pattern: QuotePatternInput
  onChange: (p: QuotePatternInput) => void
  readOnly: boolean
  priced?: QuotePricing['patterns'][number]
}) {
  const set = <K extends keyof QuotePatternInput>(key: K, value: QuotePatternInput[K]) => onChange({ ...pattern, [key]: value })
  const windowed = pattern.windowEndTime != null
  const crossesMidnight = !windowed && !!pattern.endTime && pattern.endTime <= pattern.startTime
  const [activity, setActivity] = React.useState('')
  const [oneOff, setOneOff] = React.useState('')
  const problems = patternProblems(pattern)
  // Most visits only need name, days, times and carers; the rest stays folded unless already used.
  const usesMore =
    !!pattern.careType?.trim() ||
    windowed ||
    (pattern.nightDuty ?? 'NONE') !== 'NONE' ||
    !!pattern.effectiveFrom ||
    !!pattern.effectiveTo ||
    (pattern.activities ?? []).length > 0 ||
    !!pattern.notes?.trim() ||
    pattern.manualChargePerVisit != null
  const [showMore, setShowMore] = React.useState(usesMore)
  React.useEffect(() => {
    if (usesMore) setShowMore(true)
  }, [usesMore])

  // Keep the duration in step with fixed start / end times.
  const setTimes = (startTime: string, endTime: string | null) =>
    onChange({ ...pattern, startTime, endTime, durationMinutes: endTime ? clockSpan(startTime, endTime) : pattern.durationMinutes })

  return (
    <fieldset disabled={readOnly} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Visit name" className="sm:col-span-2">
          <Input value={pattern.label} placeholder="e.g. Morning call" onChange={e => set('label', e.target.value)} />
        </Field>
        <Field label="How often">
          <select className={selectClass} value={pattern.frequency} onChange={e => set('frequency', e.target.value as QuotePatternFrequency)}>
            {(Object.keys(FREQUENCY_LABELS) as QuotePatternFrequency[]).map(f => (
              <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
            ))}
          </select>
        </Field>
        <Field label="Carers per visit">
          <Input type="number" min={1} max={4} value={pattern.carersPerVisit} onChange={e => set('carersPerVisit', Number(e.target.value))} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={windowed ? 'Window from' : 'Start'}>
          <Input type="time" value={pattern.startTime} onChange={e => (windowed ? set('startTime', e.target.value) : setTimes(e.target.value, pattern.endTime ?? null))} />
        </Field>
        {windowed ? (
          <Field label="Window to">
            <Input type="time" value={pattern.windowEndTime ?? ''} onChange={e => set('windowEndTime', e.target.value)} />
          </Field>
        ) : (
          <Field label={crossesMidnight ? 'End (next day)' : 'End'}>
            <Input type="time" value={pattern.endTime ?? ''} onChange={e => setTimes(pattern.startTime, e.target.value || null)} />
          </Field>
        )}
        <Field label="Length (min)">
          <Input
            type="number"
            min={1}
            max={1440}
            value={pattern.durationMinutes}
            readOnly={!windowed && !!pattern.endTime}
            onChange={e => set('durationMinutes', Number(e.target.value))}
          />
        </Field>
      </div>

      {pattern.frequency === 'ONE_OFF' ? (
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Dates</span>
          <div className="flex flex-wrap items-center gap-2">
            {(pattern.oneOffDates ?? []).map(d => (
              <span key={d} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                {d}
                {!readOnly && (
                  <button type="button" aria-label={`Remove ${d}`} onClick={() => set('oneOffDates', (pattern.oneOffDates ?? []).filter(x => x !== d))}>
                    ×
                  </button>
                )}
              </span>
            ))}
            <Input type="date" className="w-40" value={oneOff} onChange={e => setOneOff(e.target.value)} />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!oneOff}
              onClick={() => {
                set('oneOffDates', [...new Set([...(pattern.oneOffDates ?? []), oneOff])].sort())
                setOneOff('')
              }}
            >
              Add date
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Days</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map(d => {
              const on = pattern.daysOfWeek.includes(d.value)
              return (
                <button
                  key={d.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set('daysOfWeek', on ? pattern.daysOfWeek.filter(x => x !== d.value) : [...pattern.daysOfWeek, d.value])}
                  className={`h-8 w-12 rounded-md border text-xs font-medium ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background text-muted-foreground'}`}
                >
                  {d.short}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        className="flex items-center gap-1 self-start text-sm font-medium text-primary hover:underline"
        aria-expanded={showMore}
        onClick={() => setShowMore(v => !v)}
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`} aria-hidden />
        {showMore ? 'Fewer options' : 'More options'}
        {!showMore && <span className="font-normal text-muted-foreground">(care type, time window, activities, own price…)</span>}
      </button>

      {showMore && (
      <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Care type">
          <Input value={pattern.careType ?? ''} placeholder="e.g. Personal care" onChange={e => set('careType', e.target.value)} />
        </Field>
        <Field label="Timing">
          <select
            className={selectClass}
            value={windowed ? 'WINDOW' : 'FIXED'}
            onChange={e =>
              e.target.value === 'WINDOW'
                ? onChange({ ...pattern, windowEndTime: pattern.endTime ?? '10:00', endTime: null })
                : onChange({ ...pattern, windowEndTime: null, endTime: pattern.windowEndTime ?? '09:00' })
            }
          >
            <option value="FIXED">Fixed time</option>
            <option value="WINDOW">Time window</option>
          </select>
        </Field>
        <Field label="Visit type">
          <select className={selectClass} value={pattern.nightDuty ?? 'NONE'} onChange={e => set('nightDuty', e.target.value as QuoteNightDuty)}>
            {(Object.keys(NIGHT_DUTY_LABELS) as QuoteNightDuty[]).map(n => (
              <option key={n} value={n}>{NIGHT_DUTY_LABELS[n]}</option>
            ))}
          </select>
        </Field>
        {pattern.frequency !== 'ONE_OFF' && (
          <div className="flex flex-col gap-1">
            <span className={labelClass}>Effective</span>
            <div className="flex gap-1">
              <Input type="date" aria-label="Effective from" value={pattern.effectiveFrom ?? ''} onChange={e => set('effectiveFrom', e.target.value || null)} />
              <Input type="date" aria-label="Effective to" value={pattern.effectiveTo ?? ''} onChange={e => set('effectiveTo', e.target.value || null)} />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Activities</span>
        <div className="flex flex-wrap items-center gap-2">
          {(pattern.activities ?? []).map(a => (
            <span key={a} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
              {a}
              {!readOnly && (
                <button type="button" aria-label={`Remove ${a}`} onClick={() => set('activities', (pattern.activities ?? []).filter(x => x !== a))}>
                  ×
                </button>
              )}
            </span>
          ))}
          <Input
            className="w-56"
            placeholder="e.g. Medication prompt"
            value={activity}
            onChange={e => setActivity(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && activity.trim()) {
                e.preventDefault()
                set('activities', [...new Set([...(pattern.activities ?? []), activity.trim()])])
                setActivity('')
              }
            }}
          />
        </div>
      </div>

      <Field label="Notes">
        <Input value={pattern.notes ?? ''} onChange={e => set('notes', e.target.value)} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Own price per visit (£)">
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="Use card rate"
            value={pattern.manualChargePerVisit ?? ''}
            onChange={e => set('manualChargePerVisit', e.target.value === '' ? null : Number(e.target.value))}
          />
        </Field>
        <Field label="Reason for own price" className="sm:col-span-2">
          <Input
            value={pattern.overrideReason ?? ''}
            disabled={pattern.manualChargePerVisit == null}
            onChange={e => set('overrideReason', e.target.value)}
          />
        </Field>
      </div>
      </div>
      )}

      {priced && (
        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm sm:grid-cols-5">
          <div><dt className={labelClass}>Per visit</dt><dd>{money(priced.chargePerOccurrence)}</dd></div>
          <div><dt className={labelClass}>Visits / week</dt><dd>{priced.weeklyOccurrences}</dd></div>
          <div><dt className={labelClass}>Coverage</dt><dd>{hours(priced.weeklyCoverageMinutes)}</dd></div>
          <div><dt className={labelClass}>Carer time</dt><dd>{hours(priced.weeklyCarerMinutes)}</dd></div>
          <div><dt className={labelClass}>{pattern.frequency === 'ONE_OFF' ? 'One-off' : 'Weekly'}</dt><dd className="font-semibold">{money(pattern.frequency === 'ONE_OFF' ? priced.oneOffTotal : priced.weeklyTotal)}</dd></div>
          {priced.rateReference && <div className="col-span-full text-xs text-muted-foreground">Rate: {priced.rateReference}</div>}
        </dl>
      )}
      {[...problems, ...(priced?.issues ?? [])].length > 0 && (
        <ul className="list-disc pl-5 text-xs text-red-700 dark:text-red-300">
          {[...new Set([...problems, ...(priced?.issues ?? [])])].map(p => <li key={p}>{p}</li>)}
        </ul>
      )}
    </fieldset>
  )
}

/** Add, edit, duplicate and remove visit patterns. Double-up is set per visit (carers per visit). */
export function VisitPatternBuilder({
  patterns,
  onChange,
  readOnly,
  pricing,
  focusIndex,
  focusKey,
}: {
  patterns: QuotePatternInput[]
  onChange: (next: QuotePatternInput[]) => void
  readOnly: boolean
  pricing: QuotePricing | null
  /** Visit to open (e.g. from the problem list); focusKey changes on every request. */
  focusIndex?: number
  focusKey?: number
}) {
  const [open, setOpen] = React.useState(focusIndex ?? 0)
  const rowRefs = React.useRef<Array<HTMLDivElement | null>>([])
  React.useEffect(() => {
    if (focusIndex == null) return
    setOpen(focusIndex)
    rowRefs.current[focusIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusIndex, focusKey])
  const update = (i: number, p: QuotePatternInput) => onChange(patterns.map((x, j) => (j === i ? p : x)))
  return (
    <div className="flex flex-col gap-3" data-testid="quote-visit-patterns">
      {patterns.length === 0 && <p className="text-sm text-muted-foreground">No visits yet.</p>}
      {patterns.map((p, i) => {
        const priced = pricing?.patterns[i]
        const days = p.frequency === 'ONE_OFF' ? `${(p.oneOffDates ?? []).length} date(s)` : WEEKDAYS.filter(d => p.daysOfWeek.includes(d.value)).map(d => d.short).join(' ')
        return (
          <div
            key={i}
            ref={el => {
              rowRefs.current[i] = el
            }}
            className={`rounded-lg border ${(priced?.issues.length ?? 0) > 0 || patternProblems(p).length > 0 ? 'border-amber-300 dark:border-amber-900' : 'border-border'}`}
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === i ? -1 : i)}>
                <p className="truncate text-sm font-medium">{p.label || 'Visit'}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {days} · {p.windowEndTime ? `${p.startTime}–${p.windowEndTime} window` : `${p.startTime}${p.endTime ? `–${p.endTime}` : ''}`} · {p.durationMinutes} min
                  {p.carersPerVisit > 1 ? ` · ${p.carersPerVisit} carers` : ''}
                  {priced ? ` · ${money(p.frequency === 'ONE_OFF' ? priced.oneOffTotal : priced.weeklyTotal)}` : ''}
                </p>
              </button>
              {!readOnly && (
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="sm" aria-label="Duplicate visit" onClick={() => onChange([...patterns.slice(0, i + 1), { ...p, label: `${p.label} (copy)` }, ...patterns.slice(i + 1)])}>
                    <Copy className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" aria-label="Remove visit" onClick={() => onChange(patterns.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              )}
            </div>
            {open === i && (
              <div className="border-t border-border px-3 py-3">
                <PatternEditor pattern={p} onChange={next => update(i, next)} readOnly={readOnly} priced={priced} />
              </div>
            )}
          </div>
        )
      })}
      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => {
            onChange([...patterns, emptyPattern()])
            setOpen(patterns.length)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          Add visit
        </Button>
      )}
    </div>
  )
}
