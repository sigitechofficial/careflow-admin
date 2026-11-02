import * as React from 'react'
import { CalendarDays, ChevronDown, ChevronRight, Moon, Plus, PoundSterling, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { dayRatesNote, money } from '@/features/crm/quote-labels'
import type { QuoteDayRate, QuoteRates } from '@/features/crm/types/quotation.types'

const thClass = 'border-b border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:pl-4'
const tdClass = 'border-b border-border/70 px-3 py-2 align-middle first:pl-4'
const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm'
/** As many fixed short-visit lengths as the server accepts, each up to an hour. */
const MAX_SHORT_VISITS = 10
const MAX_SHORT_VISIT_MINUTES = 60

const num = (v: string) => (v.trim() === '' ? null : Number(v))

/** Rates that are all empty are stored as no rates (the server drops lines with no price). */
function tidy(r: QuoteRates): QuoteRates | null {
  const out: QuoteRates = {
    shortVisits: r.shortVisits ?? [],
    weekend: r.weekend ?? null,
    bankHoliday: r.bankHoliday ?? null,
    sleepingNightPrice: r.sleepingNightPrice ?? null,
    wakingNightHourly: r.wakingNightHourly ?? null,
  }
  const any =
    out.shortVisits!.length || out.weekend || out.bankHoliday || out.sleepingNightPrice != null || out.wakingNightHourly != null
  return any ? out : null
}

/** £ / % input with its unit inside the box, right-aligned like the pay card rates. */
function Amount({
  value,
  onChange,
  label,
  unit,
  pound = true,
}: {
  value: number | null | undefined
  onChange: (v: number | null) => void
  label: string
  unit: string
  pound?: boolean
}) {
  return (
    <div className="relative ml-auto w-40">
      {pound && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>}
      <Input
        type="number"
        min={0}
        step="0.01"
        className={`h-9 text-right ${pound ? 'pl-6' : ''} pr-14`}
        aria-label={label}
        placeholder="0.00"
        value={value ?? ''}
        onChange={e => onChange(num(e.target.value))}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
    </div>
  )
}

function Block({
  icon,
  tone,
  title,
  hint,
  actions,
  empty,
  children,
}: {
  icon: React.ReactNode
  tone: string
  title: string
  hint: string
  actions: React.ReactNode
  empty: string | null
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      {empty ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">{children}</div>
      )}
    </div>
  )
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="h-9 text-destructive hover:text-destructive" aria-label={label} onClick={onClick}>
      <Trash2 className="h-4 w-4" aria-hidden />
    </Button>
  )
}

/**
 * The quote's other rates, laid out like the rates on a pay card: weekend and bank holiday rates,
 * fixed short-visit prices and night duty, each a small table with its own "add" buttons. All optional.
 */
export function QuoteRatesEditor({
  value,
  onChange,
  readOnly,
}: {
  value: QuoteRates | null | undefined
  onChange: (rates: QuoteRates | null) => void
  readOnly: boolean
}) {
  const rates: QuoteRates = value ?? {}
  const [open, setOpen] = React.useState(Boolean(value))
  const set = (patch: Partial<QuoteRates>) => onChange(tidy({ ...rates, ...patch }))
  const bands = rates.shortVisits ?? []
  const setBand = (i: number, patch: Partial<{ upToMinutes: number; pricePerVisit: number }>) =>
    set({ shortVisits: bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) })
  // A new length is 15 min longer than the longest so far; past an hour, the first unused
  // 15 then 5 min step (there are more 5 min steps than lines allowed).
  const longest = Math.max(0, ...bands.map(b => b.upToMinutes || 0))
  const nextLength = [
    longest + 15,
    15, 30, 45, 60,
    ...Array.from({ length: MAX_SHORT_VISIT_MINUTES / 5 }, (_, i) => (i + 1) * 5),
  ].find(m => m <= MAX_SHORT_VISIT_MINUTES && !bands.some(b => b.upToMinutes === m)) ?? MAX_SHORT_VISIT_MINUTES
  const canAddBand = bands.length < MAX_SHORT_VISITS
  const addBands = (mins: number[]) =>
    set({
      shortVisits: [
        ...bands,
        ...mins.filter(m => !bands.some(b => b.upToMinutes === m)).map(m => ({ upToMinutes: m, pricePerVisit: 0 })),
      ].slice(0, MAX_SHORT_VISITS),
    })

  const dayRows: { key: 'weekend' | 'bankHoliday'; label: string; when: string; rate: QuoteDayRate }[] = [
    ...(rates.weekend ? [{ key: 'weekend' as const, label: 'Weekends', when: 'Saturday and Sunday', rate: rates.weekend }] : []),
    ...(rates.bankHoliday
      ? [{ key: 'bankHoliday' as const, label: 'Bank holidays', when: 'Used instead of the weekend rate', rate: rates.bankHoliday }]
      : []),
  ]
  const setDay = (key: 'weekend' | 'bankHoliday', rate: QuoteDayRate | null) => set({ [key]: rate })

  const summary = [
    ...bands.filter(b => b.pricePerVisit > 0).map(b => `up to ${b.upToMinutes} min ${money(b.pricePerVisit)}`),
    dayRatesNote(rates),
    rates.sleepingNightPrice ? `sleeping night ${money(rates.sleepingNightPrice)}` : null,
    rates.wakingNightHourly ? `waking night ${money(rates.wakingNightHourly)}/hour` : null,
  ].filter(Boolean)

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm" data-testid="quote-rates">
      <button
        type="button"
        className="flex w-full items-start gap-2 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        {open ? <ChevronDown className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden /> : <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />}
        <span className="min-w-0">
          <span className="block text-sm font-semibold">
            Other rates <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <span className="block text-xs text-muted-foreground">
            {summary.length ? summary.join(' · ') : 'Weekends, bank holidays, short visits and nights. Without them every visit uses the hourly rate.'}
          </span>
        </span>
      </button>
      {open && (
        <fieldset disabled={readOnly} className="flex flex-col gap-6 border-t border-border px-4 py-4">
          <Block
            icon={<CalendarDays className="h-4 w-4" aria-hidden />}
            tone="bg-sky-500/10 text-sky-700 dark:text-sky-300"
            title="Weekend & bank holiday rates"
            hint="On these days, a % on top of the visit price or an hourly rate instead of the standard one."
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  disabled={Boolean(rates.weekend)}
                  onClick={() => setDay('weekend', { mode: 'PERCENT', value: 0 })}
                >
                  Weekends
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  disabled={Boolean(rates.bankHoliday)}
                  onClick={() => setDay('bankHoliday', { mode: 'PERCENT', value: 0 })}
                >
                  Bank holidays
                </Button>
              </>
            }
            empty={dayRows.length ? null : 'No day rates — weekends and bank holidays are priced like weekdays.'}
          >
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className={thClass}>When this rate applies</th>
                  <th className={thClass}>How it&apos;s charged</th>
                  <th className={`${thClass} text-right`}>Rate</th>
                  <th className={`${thClass} w-14`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {dayRows.map(row => (
                  <tr key={row.key}>
                    <td className={tdClass}>
                      <p className="font-medium">{row.label}</p>
                      <p className="text-xs text-muted-foreground">{row.when}</p>
                    </td>
                    <td className={tdClass}>
                      <select
                        className={selectClass}
                        aria-label={`${row.label} charged as`}
                        value={row.rate.mode}
                        onChange={e => setDay(row.key, { ...row.rate, mode: e.target.value as QuoteDayRate['mode'] })}
                      >
                        <option value="PERCENT">% extra on the visit price</option>
                        <option value="HOURLY">£ per hour instead of the standard rate</option>
                      </select>
                    </td>
                    <td className={tdClass}>
                      <Amount
                        label={`${row.label} rate`}
                        pound={row.rate.mode === 'HOURLY'}
                        unit={row.rate.mode === 'PERCENT' ? '%' : '/ hour'}
                        value={row.rate.value || null}
                        onChange={v => setDay(row.key, { ...row.rate, value: v ?? 0 })}
                      />
                    </td>
                    <td className={tdClass}>
                      <RemoveButton label={`Remove ${row.label} rate`} onClick={() => setDay(row.key, null)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Block>

          <Block
            icon={<PoundSterling className="h-4 w-4" aria-hidden />}
            tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            title="Fixed short visits"
            hint="A flat £ per visit (per carer) by visit length, up to 60 min, instead of the hourly rate. The shortest that fits is used."
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  disabled={!canAddBand}
                  onClick={() => set({ shortVisits: [...bands, { upToMinutes: nextLength, pricePerVisit: 0 }] })}
                >
                  Add visit
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={[15, 30].every(m => bands.some(b => b.upToMinutes === m))} onClick={() => addBands([15, 30])}>
                  Add 15/30
                </Button>
              </>
            }
            empty={bands.length ? null : 'No fixed prices — short visits use the hourly rate. Use Add 15/30 for the usual set.'}
          >
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className={thClass}>Visit length</th>
                  <th className={`${thClass} text-right`}>Flat £</th>
                  <th className={`${thClass} w-14`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {bands.map((b, i) => (
                  <tr key={i}>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Up to</span>
                        <Input
                          type="number"
                          min={1}
                          max={MAX_SHORT_VISIT_MINUTES}
                          className="h-9 w-20"
                          aria-label={`Short visit ${i + 1} minutes`}
                          value={b.upToMinutes || ''}
                          onChange={e => setBand(i, { upToMinutes: Math.min(MAX_SHORT_VISIT_MINUTES, Number(e.target.value) || 0) })}
                        />
                        <span className="text-muted-foreground">min</span>
                      </div>
                    </td>
                    <td className={tdClass}>
                      <Amount
                        label={`Short visit ${i + 1} price`}
                        unit="/ visit"
                        value={b.pricePerVisit || null}
                        onChange={v => setBand(i, { pricePerVisit: v ?? 0 })}
                      />
                    </td>
                    <td className={tdClass}>
                      <RemoveButton label={`Remove short visit ${i + 1}`} onClick={() => set({ shortVisits: bands.filter((_, j) => j !== i) })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Block>

          <Block
            icon={<Moon className="h-4 w-4" aria-hidden />}
            tone="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
            title="Night duty"
            hint="Used only for visits set as a Sleeping or Waking night; per carer."
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  disabled={rates.sleepingNightPrice != null}
                  onClick={() => set({ sleepingNightPrice: 0 })}
                >
                  Sleeping night
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  disabled={rates.wakingNightHourly != null}
                  onClick={() => set({ wakingNightHourly: 0 })}
                >
                  Waking night
                </Button>
              </>
            }
            empty={
              rates.sleepingNightPrice == null && rates.wakingNightHourly == null
                ? 'No night rates — nights use the hourly rate. Flat £ per night for sleeping nights, or £ per hour for waking nights.'
                : null
            }
          >
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className={thClass}>Type</th>
                  <th className={`${thClass} text-right`}>Rate</th>
                  <th className={`${thClass} w-14`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rates.sleepingNightPrice != null && (
                  <tr>
                    <td className={tdClass}>
                      <p className="font-medium">Sleeping night</p>
                      <p className="text-xs text-muted-foreground">Flat £ for the night</p>
                    </td>
                    <td className={tdClass}>
                      <Amount
                        label="Sleeping night price"
                        unit="/ night"
                        value={rates.sleepingNightPrice || null}
                        onChange={v => set({ sleepingNightPrice: v ?? 0 })}
                      />
                    </td>
                    <td className={tdClass}>
                      <RemoveButton label="Remove sleeping night rate" onClick={() => set({ sleepingNightPrice: null })} />
                    </td>
                  </tr>
                )}
                {rates.wakingNightHourly != null && (
                  <tr>
                    <td className={tdClass}>
                      <p className="font-medium">Waking night</p>
                      <p className="text-xs text-muted-foreground">£ per hour of the night</p>
                    </td>
                    <td className={tdClass}>
                      <Amount
                        label="Waking night hourly rate"
                        unit="/ hour"
                        value={rates.wakingNightHourly || null}
                        onChange={v => set({ wakingNightHourly: v ?? 0 })}
                      />
                    </td>
                    <td className={tdClass}>
                      <RemoveButton label="Remove waking night rate" onClick={() => set({ wakingNightHourly: null })} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Block>
        </fieldset>
      )}
    </section>
  )
}
