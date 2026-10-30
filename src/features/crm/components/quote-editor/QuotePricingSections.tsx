import * as React from 'react'
import { ArrowRight, Building2, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useQuoteFunders } from '@/features/crm/hooks/useCrm'
import {
  CHARGE_FREQUENCY_LABELS,
  EXTRA_KIND_LABELS,
  FUNDING_CATEGORY_LABELS,
  FUNDING_METHOD_LABELS,
  PAYER_TYPE_LABELS,
  money,
} from '@/features/crm/quote-labels'
import type {
  QuoteChargeFrequency,
  QuoteExtraInput,
  QuoteExtraKind,
  QuoteFundingCategory,
  QuoteFundingInput,
  QuoteFundingMethod,
  QuotePricing,
} from '@/features/crm/types/quotation.types'

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
/** Select value for a funder kept by name only (no funder id). */
const LEGACY_FUNDER = '__legacy__'
const labelClass = 'text-sm font-medium text-foreground'

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
  const pct = (amount: number) => (weeklyTotal > 0 ? Math.round((amount / weeklyTotal) * 100) : 0)
  const split = pricing
    ? [
        ...fundings.map((f, i) => ({
          key: `f${i}`,
          name: f.payerName?.trim() || PAYER_TYPE_LABELS[f.payerType],
          amount: pricing.fundings[i]?.weeklyAmount ?? 0,
          pending: f.payerType !== 'PRIVATE_CLIENT' && (f.status ?? 'PENDING_APPROVAL') === 'PENDING_APPROVAL',
        })),
        { key: 'client', name: 'Client pays', amount: pricing.clientWeeklyLiability, pending: false },
      ]
    : []
  const SPLIT_COLOURS = ['bg-sky-500', 'bg-violet-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500']

  return (
    <fieldset disabled={readOnly} className="flex flex-col gap-6">
      {/* Who pays what each week */}
      {pricing && weeklyTotal > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4" data-testid="quote-funding-split">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">Who pays each week</p>
            <p className="text-sm text-muted-foreground">
              Total <span className="font-semibold text-foreground">{money(weeklyTotal)}</span> / week
            </p>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
            {split.map((s, i) =>
              s.amount > 0 ? (
                <div
                  key={s.key}
                  className={s.key === 'client' ? 'bg-emerald-500' : SPLIT_COLOURS[i % SPLIT_COLOURS.length]}
                  style={{ width: `${Math.min(100, (s.amount / weeklyTotal) * 100)}%` }}
                />
              ) : null,
            )}
          </div>
          <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
            {split.map((s, i) => (
              <li key={s.key} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.key === 'client' ? 'bg-emerald-500' : SPLIT_COLOURS[i % SPLIT_COLOURS.length]}`} aria-hidden />
                  <span className={`truncate ${s.key === 'client' ? 'font-semibold' : ''}`}>{s.name}</span>
                  {s.pending && <span className="shrink-0 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">pending</span>}
                </span>
                <span className={`shrink-0 tabular-nums ${s.key === 'client' ? 'font-semibold' : ''}`}>
                  {money(s.amount)} <span className="text-muted-foreground">({pct(s.amount)}%)</span>
                </span>
              </li>
            ))}
          </ul>
          {pricing.pendingFundingWeekly > 0 && (
            <p className="text-xs text-muted-foreground">
              If pending funding is refused, the client pays {money(pricing.clientWeeklyLiabilityIfPendingDeclined)} / week.
            </p>
          )}
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
          Extra charges or discounts
          <span className="font-normal text-muted-foreground">{extras.length ? `(${extras.length})` : '(optional: set-up fee, mileage, discount)'}</span>
        </button>
        {showExtras && extras.map((e, i) => (
          <div key={i} className="grid items-start gap-3 rounded-lg border border-border p-4 sm:grid-cols-12">
            <Field className="sm:col-span-2" label="Type">
              <select className={selectClass} value={e.kind} onChange={ev => setE(i, { kind: ev.target.value as QuoteExtraKind })}>
                {(Object.keys(EXTRA_KIND_LABELS) as QuoteExtraKind[]).map(k => <option key={k} value={k}>{EXTRA_KIND_LABELS[k]}</option>)}
              </select>
            </Field>
            <Field className="sm:col-span-4" label="Description">
              <Input value={e.description} onChange={ev => setE(i, { description: ev.target.value })} />
            </Field>
            <Field className="sm:col-span-2" label="Frequency">
              <select className={selectClass} value={e.frequency} onChange={ev => setE(i, { frequency: ev.target.value as QuoteChargeFrequency })}>
                {(Object.keys(CHARGE_FREQUENCY_LABELS) as QuoteChargeFrequency[]).map(f => <option key={f} value={f}>{CHARGE_FREQUENCY_LABELS[f]}</option>)}
              </select>
            </Field>
            {e.kind === 'MILEAGE' && (
              <Field className="sm:col-span-1" label="Miles">
                <Input type="number" min={0} value={e.quantity ?? ''} onChange={ev => setE(i, { quantity: ev.target.value === '' ? null : Number(ev.target.value) })} />
              </Field>
            )}
            <Field className={e.kind === 'MILEAGE' ? 'sm:col-span-1' : 'sm:col-span-2'} label={e.kind === 'MILEAGE' ? '£/mile' : e.kind === 'DISCOUNT' && e.isPercentage ? '%' : '£'}>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder={e.kind === 'MILEAGE' ? 'Rate' : ''}
                value={e.amount ?? ''}
                onChange={ev => setE(i, { amount: ev.target.value === '' ? null : Number(ev.target.value) })}
              />
            </Field>
            <div className="flex h-10 items-center justify-end gap-2 sm:col-span-2 sm:self-end">
              {e.kind === 'DISCOUNT' && (
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={Boolean(e.isPercentage)} onChange={ev => setE(i, { isPercentage: ev.target.checked })} />%
                </label>
              )}
              <span className="text-xs text-muted-foreground">{pricing?.extras[i] ? money(pricing.extras[i].total) : ''}</span>
              {!readOnly && (
                <Button type="button" variant="ghost" size="sm" aria-label="Remove extra" onClick={() => onExtras(extras.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        ))}
        {showExtras && !readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => onExtras([...extras, { kind: 'SETUP_FEE', description: 'Set-up fee', frequency: 'ONE_OFF', amount: 0 }])}
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Add extra or discount
          </Button>
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
            <Line label="VAT" note={pricing.vatLabel} amount={pricing.vatWeekly > 0 ? `+ ${money(pricing.vatWeekly)}` : money(0)} />
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
