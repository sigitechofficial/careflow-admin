import * as React from 'react'
import { ArrowRight, Building2, ChevronDown, Info, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useQuoteFunders } from '@/features/crm/hooks/useCrm'
import {
  CHARGE_FREQUENCY_LABELS,
  FUNDING_CATEGORY_LABELS,
  FUNDING_METHOD_LABELS,
  PAYER_TYPE_LABELS,
  money,
} from '@/features/crm/quote-labels'
import type {
  QuoteChargeFrequency,
  QuoteExtraInput,
  QuoteFundingCategory,
  QuoteFundingInput,
  QuoteFundingMethod,
  QuotePricing,
} from '@/features/crm/types/quotation.types'

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
/** Select value for a funder kept by name only (no funder id). */
const LEGACY_FUNDER = '__legacy__'
const labelClass = 'text-sm font-medium text-foreground'

/** One-click extras: care the person needs on top of the visits, then the usual charges. */
const EXTRA_PRESETS: { group: 'care' | 'charge'; extra: QuoteExtraInput }[] = [
  ...['Medication support', 'Shower / bathing', 'Meal preparation', 'Shopping', 'Laundry', 'Escort to appointments'].map(description => ({
    group: 'care' as const,
    extra: { kind: 'OTHER' as const, description, frequency: 'WEEKLY' as const, amount: null },
  })),
  { group: 'charge', extra: { kind: 'SETUP_FEE', description: 'Set-up fee', frequency: 'ONE_OFF', amount: null } },
  { group: 'charge', extra: { kind: 'MILEAGE', description: 'Mileage', frequency: 'WEEKLY', amount: null, quantity: null } },
  { group: 'charge', extra: { kind: 'DISCOUNT', description: 'Discount', frequency: 'WEEKLY', amount: null, isPercentage: false } },
]

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}

/**
 * Funding type from the funders: none → Private; one kind of funder paying 100% → that funder's type;
 * anything else (several funders, or the client topping up) → Mixed.
 */
/** Whole-number shares of the total that add up to 100 (largest remainder), so rounding never shows 99%. */
export function percentShares(amounts: number[]): number[] {
  const total = amounts.reduce((a, b) => a + Math.max(0, b), 0)
  if (total <= 0) return amounts.map(() => 0)
  const raw = amounts.map(a => (Math.max(0, a) / total) * 100)
  const out = raw.map(Math.floor)
  const order = raw.map((r, i) => ({ i, rest: r - Math.floor(r) })).sort((a, b) => b.rest - a.rest)
  const missing = 100 - out.reduce((a, b) => a + b, 0)
  for (let k = 0; k < missing; k++) {
    const j = order[k % order.length]!.i
    out[j] = (out[j] ?? 0) + 1
  }
  return out
}

export function suggestFundingCategory(fundings: QuoteFundingInput[]): QuoteFundingCategory {
  const thirdParty = fundings.filter(f => f.payerType !== 'PRIVATE_CLIENT')
  if (!thirdParty.length) return 'PRIVATE'
  const types = new Set(thirdParty.map(f => f.payerType))
  if (types.size > 1 || thirdParty.length < fundings.length) return 'MIXED'
  const partPercentage = thirdParty.every(f => f.method === 'PERCENTAGE') && thirdParty.reduce((s, f) => s + f.amount, 0) < 100
  if (partPercentage) return 'MIXED'
  const only = thirdParty[0]!.payerType
  return only === 'LOCAL_AUTHORITY' ? 'LOCAL_AUTHORITY' : only === 'NHS' ? 'NHS' : 'OTHER'
}

/** Funding category, payer allocations and extra charges / discounts. */
export function FundingAndExtras({
  category,
  onCategory,
  fundings,
  onFundings,
  extras,
  onExtras,
  readOnly,
  pricing,
  rateLabel,
  highlight,
}: {
  category: QuoteFundingCategory
  onCategory: (c: QuoteFundingCategory) => void
  fundings: QuoteFundingInput[]
  onFundings: (f: QuoteFundingInput[]) => void
  extras: QuoteExtraInput[]
  onExtras: (e: QuoteExtraInput[]) => void
  readOnly: boolean
  pricing: QuotePricing | null
  /** How visits are priced, e.g. "£25.00 per carer per hour". */
  rateLabel: string
  /** Block to scroll to and flash (from the problem list). */
  highlight?: { block: 'funding' | 'extras'; seq: number } | null
}) {
  const funders = useQuoteFunders().data ?? []
  const fundingRef = React.useRef<HTMLElement>(null)
  const extrasRef = React.useRef<HTMLElement>(null)
  const [flash, setFlash] = React.useState<'funding' | 'extras' | null>(null)
  React.useEffect(() => {
    if (!highlight) return
    ;(highlight.block === 'funding' ? fundingRef : extrasRef).current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFlash(highlight.block)
    const t = window.setTimeout(() => setFlash(null), 2500)
    return () => window.clearTimeout(t)
  }, [highlight])
  const flashClass = (block: 'funding' | 'extras') =>
    `flex flex-col gap-2 rounded-lg transition-shadow ${flash === block ? 'ring-2 ring-amber-400 ring-offset-4 ring-offset-card' : ''}`
  // Funding type follows the funders, so it can't contradict them (the server rejects "Private" with a
  // council / NHS funder, and "Mixed" with none).
  const changeFundings = (next: QuoteFundingInput[]) => {
    onFundings(next)
    const suggested = suggestFundingCategory(next)
    if (suggested !== category) onCategory(suggested)
  }
  const setF = (i: number, patch: Partial<QuoteFundingInput>) => changeFundings(fundings.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  const setE = (i: number, patch: Partial<QuoteExtraInput>) => onExtras(extras.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  const [openDetails, setOpenDetails] = React.useState<Set<number>>(new Set())
  const toggleDetails = (i: number) =>
    setOpenDetails(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  const [showExtras, setShowExtras] = React.useState(extras.length > 0)
  React.useEffect(() => {
    if (highlight?.block === 'extras' || extras.length > 0) setShowExtras(true)
  }, [highlight, extras.length])

  const weeklyTotal = pricing?.weeklyTotal ?? 0
  const SPLIT_COLOURS = ['bg-sky-500', 'bg-violet-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500']
  const splitRows = pricing
    ? [
        ...fundings.map((f, i) => ({
          key: `f${i}`,
          name: f.payerName?.trim() || PAYER_TYPE_LABELS[f.payerType],
          type: PAYER_TYPE_LABELS[f.payerType],
          amount: pricing.fundings[i]?.weeklyAmount ?? 0,
          pending: f.payerType !== 'PRIVATE_CLIENT' && (f.status ?? 'PENDING_APPROVAL') === 'PENDING_APPROVAL',
          colour: SPLIT_COLOURS[i % SPLIT_COLOURS.length],
        })),
        { key: 'client', name: 'Client pays', type: 'Whatever the funders don’t cover', amount: pricing.clientWeeklyLiability, pending: false, colour: 'bg-emerald-500' },
      ]
    : []
  const shares = percentShares(splitRows.map(r => r.amount))
  const split = splitRows.map((r, i) => ({ ...r, share: shares[i] ?? 0 }))

  return (
    <fieldset disabled={readOnly} className="flex flex-col gap-6">
      {/* Who pays what each week */}
      {pricing && weeklyTotal > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" data-testid="quote-funding-split">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <p className="text-sm font-semibold">Who pays each week</p>
              <p className="text-xs text-muted-foreground">Each payer’s share of the weekly price</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Weekly total</p>
              <p className="text-xl font-semibold tabular-nums">{money(weeklyTotal)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-5 py-4">
            {/* One bar, each payer's share labelled where it fits. */}
            <div className="flex h-7 gap-0.5 overflow-hidden rounded-md bg-muted" aria-hidden>
              {split.map(s =>
                s.amount > 0 ? (
                  <div
                    key={s.key}
                    className={`flex items-center justify-center text-[11px] font-semibold text-white ${s.colour}`}
                    style={{ width: `${Math.min(100, (s.amount / weeklyTotal) * 100)}%` }}
                  >
                    {s.share >= 8 ? `${s.share}%` : ''}
                  </div>
                ) : null,
              )}
            </div>

            <ul className="divide-y divide-border rounded-lg border border-border">
              {split.map(s => (
                <li
                  key={s.key}
                  className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_9rem_6rem] ${s.key === 'client' ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''}`}
                  data-testid={`quote-split-${s.key}`}
                >
                  <span className={`h-3 w-3 rounded-sm ${s.colour}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="break-words text-sm font-medium">{s.name}</span>
                      {s.pending && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Pending approval
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{s.type}</span>
                  </span>
                  <span className="text-right text-sm tabular-nums">
                    <span className="font-semibold">{money(s.amount)}</span>
                    <span className="text-muted-foreground"> / week</span>
                  </span>
                  <span className="col-span-3 flex items-center gap-2 sm:col-span-1 sm:justify-end">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted sm:hidden" aria-hidden>
                      <span className={`block h-full ${s.colour}`} style={{ width: `${s.share}%` }} />
                    </span>
                    <span className="min-w-[3.5rem] rounded-md bg-muted px-2 py-1 text-center text-sm font-semibold tabular-nums">
                      {s.share}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {pricing.pendingFundingWeekly > 0 && (
              <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  {money(pricing.pendingFundingWeekly)} / week is still pending approval. If it is refused, the client pays{' '}
                  <span className="font-semibold">{money(pricing.clientWeeklyLiabilityIfPendingDeclined)}</span> / week.
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      <section ref={fundingRef} className={flashClass('funding')}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold">Funders</h4>
          <span className="text-xs text-muted-foreground">Whatever the funders don’t cover, the client pays.</span>
        </div>
        {fundings.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            No funders — the client pays the full amount. Add a council, NHS or other funder if someone else pays some or all of it.
          </p>
        )}
        {fundings.map((f, i) => {
          const status = f.payerType === 'PRIVATE_CLIENT' ? 'CONFIRMED' : (f.status ?? 'PENDING_APPROVAL')
          const weekly = pricing?.fundings[i]?.weeklyAmount
          const detailsOpen = openDetails.has(i) || !!f.reference?.trim()
          return (
            <div key={i} className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_8rem_auto]">
                <Field label="Funder">
                  <select
                    className={selectClass}
                    value={f.funderId ?? (f.payerName ? LEGACY_FUNDER : '')}
                    onChange={e => {
                      const picked = funders.find(o => o.id === e.target.value)
                      if (picked) setF(i, { funderId: picked.id, payerName: picked.name, payerType: picked.payerType })
                    }}
                  >
                    {!f.funderId && !f.payerName && <option value="">Choose a funder…</option>}
                    {/* A funder typed in by hand before the list was used, or one since removed from the list. */}
                    {(f.funderId ? !funders.some(o => o.id === f.funderId) : !!f.payerName) && (
                      <option value={f.funderId ?? LEGACY_FUNDER}>
                        {f.payerName?.trim() || PAYER_TYPE_LABELS[f.payerType]} (not in the funder list)
                      </option>
                    )}
                    {funders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.fundingTypeName && o.fundingTypeName !== o.name ? `${o.name} · ${o.fundingTypeName}` : o.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Pays">
                  <select className={selectClass} value={f.method} onChange={e => setF(i, { method: e.target.value as QuoteFundingMethod })}>
                    {(Object.keys(FUNDING_METHOD_LABELS) as QuoteFundingMethod[]).map(m => <option key={m} value={m}>{FUNDING_METHOD_LABELS[m]}</option>)}
                  </select>
                </Field>
                <Field label="Amount">
                  <div className="relative">
                    {f.method !== 'PERCENTAGE' && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>}
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className={f.method === 'PERCENTAGE' ? 'pr-8' : 'pl-7'}
                      value={f.amount}
                      onChange={e => setF(i, { amount: Number(e.target.value) })}
                    />
                    {f.method === 'PERCENTAGE' && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>}
                  </div>
                </Field>
                {!readOnly ? (
                  <Button type="button" variant="ghost" size="sm" className="h-10" aria-label="Remove funding" onClick={() => changeFundings(fundings.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                ) : <span />}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                  Covers <span className="font-semibold text-foreground">{weekly != null ? money(weekly) : '—'}</span> / week
                  {split[i] && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-semibold text-foreground">
                      <span className={`h-2 w-2 rounded-sm ${split[i].colour}`} aria-hidden />
                      {split[i].share}% of the total
                    </span>
                  )}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                >
                  {status === 'CONFIRMED' ? 'Confirmed' : 'Pending approval'}
                </span>
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => toggleDetails(i)}>
                  {detailsOpen ? 'Hide reference and status' : 'Reference and status'}
                </button>
              </div>
              {detailsOpen && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Reference">
                    <Input value={f.reference ?? ''} placeholder="Funding or case reference" onChange={e => setF(i, { reference: e.target.value })} />
                  </Field>
                  <Field label="Status">
                    <select
                      className={selectClass}
                      value={status}
                      disabled={f.payerType === 'PRIVATE_CLIENT'}
                      onChange={e => setF(i, { status: e.target.value as QuoteFundingInput['status'] })}
                    >
                      <option value="PENDING_APPROVAL">Pending approval</option>
                      <option value="CONFIRMED">Confirmed</option>
                    </select>
                  </Field>
                </div>
              )}
            </div>
          )
        })}
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => changeFundings([...fundings, { payerType: 'LOCAL_AUTHORITY', method: 'PERCENTAGE', amount: 100, status: 'PENDING_APPROVAL' }])}
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Add funder
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Funding type: <span className="font-medium text-foreground">{FUNDING_CATEGORY_LABELS[category]}</span> (set from the funders)
          {' · '}Visits priced at <span className="font-medium text-foreground">{rateLabel}</span>
        </p>
      </section>

      <section ref={extrasRef} className={flashClass('extras')}>
        <button
          type="button"
          className="flex items-center gap-1 self-start text-sm font-semibold"
          aria-expanded={showExtras}
          onClick={() => setShowExtras(v => !v)}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showExtras ? 'rotate-180' : ''}`} aria-hidden />
          Extra care & charges
          <span className="font-normal text-muted-foreground">
            {extras.length ? `(${extras.length})` : '(optional: medication, shower, set-up fee, discount…)'}
          </span>
        </button>
        {showExtras && !readOnly && (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3" data-testid="quote-extra-presets">
            {(['care', 'charge'] as const).map(group => (
              <div key={group} className="flex flex-col gap-1.5 sm:flex-row sm:items-start">
                <span className="w-24 shrink-0 pt-1.5 text-xs font-medium text-muted-foreground">{group === 'care' ? 'Extra care' : 'Charges'}</span>
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {EXTRA_PRESETS.filter(x => x.group === group).map(({ extra }) => {
                    const added = extras.some(e => e.kind === extra.kind && e.description === extra.description)
                    return (
                      <Button
                        key={extra.description}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full"
                        disabled={added}
                        onClick={() => onExtras([...extras, { ...extra }])}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                        {extra.description}
                      </Button>
                    )
                  })}
                  {group === 'charge' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full"
                      onClick={() => onExtras([...extras, { kind: 'OTHER', description: '', frequency: 'WEEKLY', amount: null }])}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Something else
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {showExtras && extras.length > 0 && (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {extras.map((e, i) => {
              const mileage = e.kind === 'MILEAGE'
              const discount = e.kind === 'DISCOUNT'
              const total = pricing?.extras[i]?.total
              return (
                <li key={i} className="grid items-center gap-2 p-3 sm:grid-cols-12" data-testid={`quote-extra-${i}`}>
                  <Input
                    className="sm:col-span-4"
                    aria-label="Extra name"
                    placeholder="e.g. Night sitting"
                    value={e.description}
                    onChange={ev => setE(i, { description: ev.target.value })}
                  />
                  {mileage ? (
                    <div className="flex items-center gap-2 sm:col-span-3">
                      <Input
                        type="number"
                        min={0}
                        aria-label="Miles"
                        placeholder="Miles"
                        value={e.quantity ?? ''}
                        onChange={ev => setE(i, { quantity: ev.target.value === '' ? null : Number(ev.target.value) })}
                      />
                      <span className="text-xs text-muted-foreground">×</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        aria-label="£ per mile"
                        placeholder="£/mile"
                        value={e.amount ?? ''}
                        onChange={ev => setE(i, { amount: ev.target.value === '' ? null : Number(ev.target.value) })}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 sm:col-span-3">
                      <div className="relative flex-1">
                        {!(discount && e.isPercentage) && (
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                        )}
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          aria-label={discount && e.isPercentage ? 'Discount %' : 'Amount £'}
                          placeholder="0.00"
                          className={discount && e.isPercentage ? '' : 'pl-7'}
                          value={e.amount ?? ''}
                          onChange={ev => setE(i, { amount: ev.target.value === '' ? null : Number(ev.target.value) })}
                        />
                      </div>
                      {discount && (
                        <select
                          className="h-10 w-16 rounded-md border border-input bg-background px-2 text-sm"
                          aria-label="Discount in"
                          value={e.isPercentage ? '%' : '£'}
                          onChange={ev => setE(i, { isPercentage: ev.target.value === '%' })}
                        >
                          <option value="£">£</option>
                          <option value="%">%</option>
                        </select>
                      )}
                    </div>
                  )}
                  <select
                    className={`${selectClass} sm:col-span-3`}
                    aria-label="How often"
                    value={e.frequency}
                    onChange={ev => setE(i, { frequency: ev.target.value as QuoteChargeFrequency })}
                  >
                    {(Object.keys(CHARGE_FREQUENCY_LABELS) as QuoteChargeFrequency[]).map(f => (
                      <option key={f} value={f}>
                        {CHARGE_FREQUENCY_LABELS[f]}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-end gap-1 sm:col-span-2">
                    <span className={`text-sm tabular-nums ${discount ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                      {discount ? (e.amount ? (e.isPercentage ? `− ${e.amount}%` : `− ${money(e.amount)}`) : '') : total != null ? money(total) : ''}
                    </span>
                    {!readOnly && (
                      <Button type="button" variant="ghost" size="sm" aria-label="Remove extra" onClick={() => onExtras(extras.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </fieldset>
  )
}

/** Plain names for the longer-period estimates (the weekly one is the headline). */
const ESTIMATE_LABELS: Record<string, string> = {
  fourWeekly: 'Every 4 weeks',
  monthlyAverage: 'Average month',
  annual: 'A year',
}

const monthName = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : ym
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const hoursText = (minutes: number) => plural(Math.round((minutes / 60) * 100) / 100, 'hour')

/** One line of a receipt-style list: label (with a short note) on the left, amount on the right. */
function Line({ label, note, amount, strong }: { label: string; note?: string | null; amount: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2 ${strong ? 'font-semibold' : ''}`}>
      <div className="min-w-0">
        <dt className={strong ? 'text-base' : 'text-sm'}>{label}</dt>
        {note ? <dd className="text-xs font-normal text-muted-foreground">{note}</dd> : null}
      </div>
      <dd className={`shrink-0 tabular-nums ${strong ? 'text-base' : 'text-sm'}`}>{amount}</dd>
    </div>
  )
}

/**
 * The price in plain words: what the client pays a week, how that is made up, what it comes to over
 * longer periods, and each visit. Lines that are nothing (no extras, discount or funding) are left out.
 */
export function CostSummary({
  pricing,
  calculating,
  onResolve,
}: {
  pricing: QuotePricing | null
  calculating?: boolean
  /** Opens the place where a problem is fixed. */
  onResolve?: (message: string) => void
}) {
  if (!pricing) return <p className="text-sm text-muted-foreground">{calculating ? 'Calculating…' : 'Add visits to see the price.'}</p>
  const visitsPerWeek = pricing.patterns.reduce((n, p) => n + p.weeklyOccurrences, 0)
  const funded = pricing.fundedWeekly > 0
  const extraCarerTime = pricing.weeklyCarerMinutes > pricing.weeklyCoverageMinutes
  const longer = pricing.estimates.filter(e => e.key !== 'weekly')
  return (
    <div className="flex flex-col gap-5" data-testid="quote-cost-summary">
      {pricing.issues.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <p className="font-medium">This quote cannot be issued yet ({pricing.unresolvedCharges} unresolved):</p>
          <ul className="mt-2 flex flex-col gap-1">
            {pricing.issues.map(i => (
              <li key={i} className="flex items-start justify-between gap-3">
                <span className="flex gap-1.5"><span aria-hidden>•</span>{i}</span>
                {onResolve && (
                  <button type="button" className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline" onClick={() => onResolve(i)}>
                    Fix <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-primary/25 bg-primary/5 px-5 py-4" data-testid="quote-client-pays">
        <p className="text-sm font-medium text-muted-foreground">The client pays</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
          {money(pricing.clientWeeklyLiability)} <span className="text-base font-medium text-muted-foreground">a week</span>
        </p>
        <p className="mt-1 text-sm text-foreground">
          {pricing.manual ? (
            <>For {plural(visitsPerWeek, 'visit')} a week, at the agreed weekly price.</>
          ) : (
            <>
              For {hoursText(pricing.weeklyCoverageMinutes)} of care a week ({plural(visitsPerWeek, 'visit')})
              {extraCarerTime ? `, ${hoursText(pricing.weeklyCarerMinutes)} of carer time as some visits have 2 carers` : ''}.
            </>
          )}
        </p>
        {funded ? (
          <p className="mt-1 text-sm text-muted-foreground">
            The care costs {money(pricing.weeklyTotal)} a week; funders pay {money(pricing.fundedWeekly)} of it.
          </p>
        ) : null}
        {pricing.pendingFundingWeekly > 0 ? (
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {money(pricing.pendingFundingWeekly)} of the funding is waiting for approval. If it is refused, the client pays{' '}
            {money(pricing.clientWeeklyLiabilityIfPendingDeclined)} a week.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border p-4">
          <h4 className="text-sm font-semibold">How the weekly price is made up</h4>
          <dl className="mt-1 divide-y divide-border/70">
            <Line
              label="Visits"
              note={`${plural(visitsPerWeek, 'visit')} a week${pricing.manual ? ' · agreed weekly price' : ''}`}
              amount={money(pricing.visitsWeekly)}
            />
            {pricing.extrasWeekly > 0 && <Line label="Extras" amount={`+ ${money(pricing.extrasWeekly)}`} />}
            {pricing.discountWeekly > 0 && <Line label="Discount" amount={`− ${money(pricing.discountWeekly)}`} />}
            {/* Care is VAT exempt, so VAT is only shown when the quote charges it. */}
            {pricing.vatWeekly > 0 && <Line label="VAT" note={pricing.vatLabel} amount={`+ ${money(pricing.vatWeekly)}`} />}
            <Line label="Total a week" amount={money(pricing.weeklyTotal)} strong />
            {funded && (
              <>
                <Line label="Paid by funders" amount={`− ${money(pricing.fundedWeekly)}`} />
                <Line label="The client pays a week" amount={money(pricing.clientWeeklyLiability)} strong />
              </>
            )}
          </dl>
        </section>

        <section className="rounded-lg border border-border p-4">
          <h4 className="text-sm font-semibold">Over a longer time</h4>
          <dl className="mt-1 divide-y divide-border/70">
            {longer.map(e => (
              <Line key={e.key} label={ESTIMATE_LABELS[e.key] ?? e.label} note={e.method} amount={money(e.amount)} />
            ))}
            <Line
              label={`${monthName(pricing.calendarMonth.month)} (real dates)`}
              note={pricing.calendarMonth.method}
              amount={pricing.calendarMonth.complete ? money(pricing.calendarMonth.amount) : '—'}
            />
            {pricing.oneOffTotal > 0 && (
              <Line label="One-off charges" note="Paid once, not in the weekly price" amount={money(pricing.oneOffTotal)} />
            )}
          </dl>
        </section>
      </div>

      {pricing.patterns.length > 0 && !pricing.manual && (
        <section className="rounded-lg border border-border p-4">
          <h4 className="text-sm font-semibold">Each visit in a typical week</h4>
          <ul className="mt-1 divide-y divide-border/70">
            {pricing.patterns.map(p => {
              const days = [...new Set(p.occurrences.map(o => o.weekday.slice(0, 3)))]
              const bankHolidays = p.occurrences.filter(o => o.isBankHoliday).length
              return (
                <li key={p.index} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {days.length === 7 ? 'Every day' : days.join(', ') || 'Not in a typical week'}
                      {p.rateReference ? ` · ${p.rateReference}` : ''}
                      {bankHolidays > 0 ? ` · ${plural(bankHolidays, 'bank holiday')}` : ''}
                    </p>
                    {p.issues.map(i => (
                      <p key={i} className="text-xs text-red-700 dark:text-red-300">{i}</p>
                    ))}
                  </div>
                  <p className="shrink-0 tabular-nums">
                    {p.chargePerOccurrence != null && p.weeklyOccurrences > 0 ? (
                      <span className="text-muted-foreground">{p.weeklyOccurrences} × {money(p.chargePerOccurrence)} = </span>
                    ) : null}
                    <span className="font-medium">{money(p.weeklyTotal)}</span>
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
