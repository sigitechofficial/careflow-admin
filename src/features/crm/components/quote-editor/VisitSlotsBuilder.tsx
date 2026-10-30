import * as React from 'react'
import { Clock, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import { useMedicationRounds } from '@/features/settings/hooks/useMedicationRounds'
import { sortMedicationRounds, type MedicationRoundLookup } from '@/features/service-users/medication/medication-time-slots'
import { roundFor } from '@/features/crm/components/quote-editor/VisitPatternBuilder'
import { emptyPattern } from '@/features/crm/quote-labels'
import type { QuotePatternInput } from '@/features/crm/types/quotation.types'

const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const thClass = 'border-b border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-4'
const tdClass = 'border-b border-border/70 px-3 py-2 align-middle first:pl-4'

const plusMinutes = (hm: string, add: number) => {
  const m = (Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5)) + add) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * A visit in a time slot, for a "total amount" quote. It is kept as an ordinary visit at the slot's
 * time (so a care package can still be made from it), but no time or length is asked for or shown.
 */
function slotVisit(round: MedicationRoundLookup, base?: QuotePatternInput): QuotePatternInput {
  const start = round.time || round.windowStart || '08:00'
  return {
    ...(base ?? emptyPattern()),
    label: `${round.name} visit`,
    startTime: start,
    endTime: plusMinutes(start, 30),
    windowEndTime: null,
    durationMinutes: 30,
    frequency: 'WEEKLY',
    oneOffDates: [],
    nightDuty: 'NONE',
  }
}

/** The visits of a "total amount" quote: a time of day, the days and how many carers — no times. */
export function VisitSlotsBuilder({
  patterns,
  onChange,
  readOnly,
}: {
  patterns: QuotePatternInput[]
  onChange: (next: QuotePatternInput[]) => void
  readOnly: boolean
}) {
  const { data: roundRows = [] } = useMedicationRounds()
  const rounds = React.useMemo(() => sortMedicationRounds(roundRows.filter(r => r.isActive !== false)), [roundRows])
  const set = (i: number, next: QuotePatternInput) => onChange(patterns.map((p, j) => (j === i ? next : p)))
  const toggleDay = (i: number, d: number) => {
    const p = patterns[i]!
    const days = p.daysOfWeek.includes(d) ? p.daysOfWeek.filter(x => x !== d) : [...p.daysOfWeek, d]
    set(i, { ...p, daysOfWeek: days })
  }
  const unused = rounds.find(r => !patterns.some(p => roundFor(p, rounds)?.code === r.code)) ?? rounds[0]

  // Visits made with times (before switching to a total) take their slot's name, as the client sees it.
  React.useEffect(() => {
    if (readOnly || !rounds.length) return
    const named = patterns.map(p => {
      const r = roundFor(p, rounds)
      return r && p.label !== `${r.name} visit` ? { ...p, label: `${r.name} visit` } : p
    })
    if (named.some((p, i) => p !== patterns[i])) onChange(named)
  }, [patterns, rounds, readOnly, onChange])

  return (
    <section className="space-y-2" data-testid="quote-visit-slots">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <Clock className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">Visits</p>
            <p className="text-xs text-muted-foreground">The time of day, the days and how many carers. The client sees no times.</p>
          </div>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            disabled={!unused}
            onClick={() => unused && onChange([...patterns, slotVisit(unused)])}
          >
            Add visit
          </Button>
        )}
      </div>
      {patterns.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
          No visits yet — add a Morning, Lunchtime, Evening or Night visit.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className={thClass}>Time of day</th>
                <th className={thClass}>Days</th>
                <th className={thClass}>Carers</th>
                <th className={`${thClass} w-14`}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {patterns.map((p, i) => {
                const round = roundFor(p, rounds)
                return (
                  <tr key={i} data-testid={`quote-slot-visit-${i}`}>
                    <td className={tdClass}>
                      <select
                        className="h-9 w-48 rounded-md border border-input bg-background px-2.5 text-sm"
                        aria-label={`Visit ${i + 1} time of day`}
                        disabled={readOnly}
                        value={round?.code ?? ''}
                        onChange={e => {
                          const r = rounds.find(x => x.code === e.target.value)
                          if (r) set(i, slotVisit(r, p))
                        }}
                      >
                        {rounds.map(r => (
                          <option key={r.code} value={r.code}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={tdClass}>
                      <div className="flex flex-wrap gap-1" role="group" aria-label={`Visit ${i + 1} days`}>
                        {MONDAY_FIRST.map(d => {
                          const on = p.daysOfWeek.includes(d)
                          return (
                            <button
                              key={d}
                              type="button"
                              aria-pressed={on}
                              disabled={readOnly}
                              onClick={() => toggleDay(i, d)}
                              className={cn(
                                'h-8 min-w-10 rounded-md border px-2 text-xs font-medium transition',
                                on ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/40',
                              )}
                            >
                              {DAY_LABELS[d]}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                    <td className={tdClass}>
                      <Input
                        type="number"
                        min={1}
                        max={6}
                        className="h-9 w-20"
                        aria-label={`Visit ${i + 1} carers`}
                        disabled={readOnly}
                        value={p.carersPerVisit}
                        onChange={e => set(i, { ...p, carersPerVisit: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </td>
                    <td className={tdClass}>
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 text-destructive hover:text-destructive"
                          aria-label={`Remove visit ${i + 1}`}
                          onClick={() => onChange(patterns.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
