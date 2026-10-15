import * as React from 'react'
import { Calculator, RotateCcw, Search } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Switch } from '@/shared/ui/toggle-controls'
import { cn } from '@/shared/lib/utils'
import { useDebouncedValue } from '@/features/policies/hooks/useDebouncedValue'
import { useBaselineEstimate, useEstimate, useRetailPrices } from '@/features/azure-pricing/hooks/useAzurePricing'
import { DB_SKUS, type DbSku, type EstimateInput } from '@/features/azure-pricing/types'
import {
  DEFAULT_ESTIMATE_INPUT,
  ESTIMATE_NUMERIC_RULES,
  buildEstimatePayload,
  estimateInputToForm,
  type EstimateFormValues,
} from '@/features/azure-pricing/lib/azure-pricing-forms'
import {
  formatDateGb,
  formatDateTimeGb,
  formatMoney,
  formatMoneyDifference,
  formatRelativeTime,
  formatUnitPrice,
} from '@/features/azure-pricing/lib/azure-pricing-format'
import {
  LoadingRegion,
  PanelCard,
  TabErrorState,
  TableSkeleton,
} from '@/features/azure-pricing/components/AzurePricingShared'

const ALL_SERVICES = '__all__'
const MAX_PRICE_ROWS = 200

/* ─── Live price list ───────────────────────────────────────────────────── */

function PriceList() {
  const [usedOnly, setUsedOnly] = React.useState(true)
  const [service, setService] = React.useState<string>(ALL_SERVICES)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebouncedValue(search, 200)
  const query = useRetailPrices({ usedOnly })
  const data = query.data
  const currency = data?.currency || 'GBP'

  const services = React.useMemo(
    () => [...new Set((data?.items ?? []).map(i => i.serviceName))].sort((a, b) => a.localeCompare(b)),
    [data],
  )

  const filtered = React.useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    return (data?.items ?? []).filter(i => {
      if (service !== ALL_SERVICES && i.serviceName !== service) return false
      if (!term) return true
      return [i.serviceName, i.productName, i.skuName, i.meterName, i.unitOfMeasure]
        .some(v => v?.toLowerCase().includes(term))
    })
  }, [data, service, debouncedSearch])

  return (
    <PanelCard
      title="Live Azure prices"
      description={
        data ? (
          <>
            Azure Retail Prices · {data.region} · {currency} · refreshed{' '}
            <span title={formatDateTimeGb(data.refreshedAt)}>{formatRelativeTime(data.refreshedAt)}</span>
          </>
        ) : (
          'Azure Retail Prices API (list prices, excluding discounts)'
        )
      }
      bodyClassName="p-0"
      data-testid="azure-price-list"
    >
      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_minmax(0,14rem)_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="azure-price-search">Search</Label>
          <Input
            id="azure-price-search"
            type="search"
            placeholder="Product, SKU or meter…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftElement={<Search className="h-4 w-4" aria-hidden />}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="azure-price-service">Service</Label>
          <Select value={service} onValueChange={setService}>
            <SelectTrigger id="azure-price-service" aria-label="Service">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SERVICES}>All services</SelectItem>
              {services.map(s => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex h-9 items-center gap-2 text-sm" htmlFor="azure-price-used-only">
          <Switch
            id="azure-price-used-only"
            checked={usedOnly}
            onCheckedChange={v => {
              setUsedOnly(v)
              setService(ALL_SERVICES)
            }}
          />
          Only what we use
        </label>
      </div>

      {query.isLoading ? (
        <div className="p-4">
          <LoadingRegion label="Loading prices">
            <TableSkeleton rows={6} />
          </LoadingRegion>
        </div>
      ) : query.isError || !data ? (
        <div className="p-4">
          <TabErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
        </div>
      ) : data.items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          {data.refreshedAt
            ? 'No prices match these filters.'
            : 'Prices have not been fetched yet. They are refreshed daily once Azure cost tracking is switched on.'}
        </p>
      ) : (
        <div className={cn('transition-opacity', query.isFetching && 'opacity-60')}>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-[1] bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Service / product</th>
                  <th scope="col" className="px-4 py-2 font-medium">SKU · meter</th>
                  <th scope="col" className="px-4 py-2 font-medium">Unit</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Unit price</th>
                  <th scope="col" className="hidden px-4 py-2 font-medium md:table-cell">Effective</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.slice(0, MAX_PRICE_ROWS).map(i => (
                  <tr key={i.id}>
                    <td className="px-4 py-2">
                      <span className="block font-medium text-foreground">{i.serviceName}</span>
                      <span className="block text-xs text-muted-foreground">{i.productName}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="block">{i.skuName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {i.meterName}
                        {i.armRegionName ? ` · ${i.armRegionName}` : ''}
                      </span>
                      {i.usedByUs && !usedOnly ? (
                        <Badge variant="success" size="sm" className="mt-1">In use</Badge>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{i.unitOfMeasure}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                      {formatUnitPrice(i.unitPrice, currency)}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-2 text-muted-foreground md:table-cell">
                      {formatDateGb(i.effectiveStartDate?.slice(0, 10))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground" aria-live="polite">
            {filtered.length > MAX_PRICE_ROWS
              ? `Showing ${MAX_PRICE_ROWS} of ${filtered.length.toLocaleString('en-GB')} prices — refine the search to narrow it down.`
              : `${filtered.length.toLocaleString('en-GB')} ${filtered.length === 1 ? 'price' : 'prices'}`}
          </p>
        </div>
      )}
    </PanelCard>
  )
}

/* ─── What-if calculator ────────────────────────────────────────────────── */

type NumericField = keyof typeof ESTIMATE_NUMERIC_RULES

const FIELD_ORDER: { key: NumericField; step: string; suffix?: string }[] = [
  { key: 'apiReplicas', step: '1' },
  { key: 'apiVcpu', step: '0.25' },
  { key: 'apiMemoryGiB', step: '0.5' },
  { key: 'dbStorageGiB', step: '1' },
  { key: 'privateEndpoints', step: '1' },
  { key: 'logGbPerDay', step: '0.1' },
  { key: 'storageGiB', step: '1' },
  { key: 'emailsPerMonth', step: '100' },
]

/** Prefer explicit `inputs` from the baseline response (if the API sends them), else the known architecture. */
function baselineInputs(baseline: unknown): EstimateInput {
  if (baseline && typeof baseline === 'object' && 'inputs' in baseline) {
    const inputs = (baseline as { inputs?: Partial<EstimateInput> }).inputs
    if (inputs && typeof inputs === 'object') return { ...DEFAULT_ESTIMATE_INPUT, ...inputs }
  }
  return DEFAULT_ESTIMATE_INPUT
}

function WhatIfCalculator() {
  const baselineQuery = useBaselineEstimate()
  const initial = React.useMemo(() => baselineInputs(baselineQuery.data), [baselineQuery.data])
  const [form, setForm] = React.useState<EstimateFormValues>(() => estimateInputToForm(DEFAULT_ESTIMATE_INPUT))
  const [touched, setTouched] = React.useState(false)

  // Prefill from the baseline once it arrives (unless the user already started editing).
  React.useEffect(() => {
    if (!touched) setForm(estimateInputToForm(initial))
  }, [initial, touched])

  const built = buildEstimatePayload(form)
  const payloadKey = built.ok ? JSON.stringify(built.payload) : null
  const debouncedKey = useDebouncedValue(payloadKey, 400)
  const debouncedPayload = React.useMemo(
    () => (debouncedKey ? (JSON.parse(debouncedKey) as EstimateInput) : null),
    [debouncedKey],
  )
  const estimate = useEstimate(debouncedPayload)
  const result = estimate.data
  const currency = result?.currency || baselineQuery.data?.currency || 'GBP'
  const errors = built.ok ? {} : built.errors

  const update = <K extends keyof EstimateFormValues>(key: K, value: EstimateFormValues[K]) => {
    setTouched(true)
    setForm(f => ({ ...f, [key]: value }))
  }

  const reset = () => {
    setTouched(false)
    setForm(estimateInputToForm(initial))
  }

  const assumptions = result?.assumptions?.length ? result.assumptions : baselineQuery.data?.assumptions ?? []

  return (
    <PanelCard
      title={
        <span className="inline-flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" aria-hidden />
          What-if calculator
        </span>
      }
      description="Model architecture changes against today's live list prices. Estimates only — real bills include usage variation and discounts."
      action={
        <Button size="sm" variant="ghost" onClick={reset} leftIcon={<RotateCcw className="h-4 w-4" aria-hidden />}>
          Reset to current
        </Button>
      }
      data-testid="azure-calculator"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_1fr]">
        <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1" onSubmit={e => e.preventDefault()} noValidate>
          {FIELD_ORDER.slice(0, 3).map(({ key, step }) => (
            <NumberField key={key} name={key} step={step} value={form[key]} error={errors[key]} onChange={v => update(key, v)} />
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="azure-calc-dbSku">Database SKU</Label>
            <Select value={form.dbSku} onValueChange={v => update('dbSku', v as DbSku)}>
              <SelectTrigger id="azure-calc-dbSku" aria-label="Database SKU" error={!!errors.dbSku}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DB_SKUS.map(s => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {FIELD_ORDER.slice(3, 4).map(({ key, step }) => (
            <NumberField key={key} name={key} step={step} value={form[key]} error={errors[key]} onChange={v => update(key, v)} />
          ))}
          <label className="flex items-center gap-2 text-sm sm:col-span-2 xl:col-span-1" htmlFor="azure-calc-ha">
            <Switch
              id="azure-calc-ha"
              checked={form.dbHighAvailability}
              onCheckedChange={v => update('dbHighAvailability', v)}
            />
            Database high availability (zone-redundant standby)
          </label>
          {FIELD_ORDER.slice(4).map(({ key, step }) => (
            <NumberField key={key} name={key} step={step} value={form[key]} error={errors[key]} onChange={v => update(key, v)} />
          ))}
        </form>

        <div className="min-w-0 space-y-4">
          {estimate.isError ? (
            <TabErrorState
              error={estimate.error}
              onRetry={() => void estimate.refetch()}
              retrying={estimate.isFetching}
              title="Could not calculate the estimate"
            />
          ) : !result ? (
            <LoadingRegion label="Calculating estimate">
              <TableSkeleton rows={6} />
            </LoadingRegion>
          ) : (
            <div className={cn('space-y-4 transition-opacity', (estimate.isFetching || payloadKey !== debouncedKey) && 'opacity-60')}>
              <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
                <TotalTile label="Current (baseline)" value={formatMoney(result.baselineMonthly, currency)} />
                <TotalTile label="Scenario" value={formatMoney(result.scenarioMonthly, currency)} />
                <TotalTile
                  label="Difference per month"
                  value={formatMoneyDifference(result.difference, currency)}
                  tone={result.difference > 0.004 ? 'up' : result.difference < -0.004 ? 'down' : 'flat'}
                />
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm" data-testid="azure-calculator-lines">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Line</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Baseline</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Scenario</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.lines.map(l => {
                      const changed = Math.abs(l.difference) >= 0.005
                      return (
                        <tr key={l.key} className={cn(changed && 'bg-primary/5')}>
                          <td className="px-3 py-2">
                            <span className="block font-medium text-foreground">{l.label}</span>
                            {l.note ? <span className="block text-xs text-muted-foreground">{l.note}</span> : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMoney(l.baseline, currency)}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMoney(l.scenario, currency)}</td>
                          <td
                            className={cn(
                              'whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums',
                              !changed && 'text-muted-foreground',
                              changed && l.difference > 0 && 'text-destructive',
                              changed && l.difference < 0 && 'text-success',
                            )}
                          >
                            {formatMoneyDifference(l.difference, currency)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-muted/30 font-semibold">
                    <tr>
                      <th scope="row" className="px-3 py-2 text-left">Monthly total</th>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(result.baselineMonthly, currency)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(result.scenarioMonthly, currency)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoneyDifference(result.difference, currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {baselineQuery.data && baselineQuery.data.lines.length > 0 ? (
            <details className="rounded-lg border border-border p-3 text-sm">
              <summary className="cursor-pointer font-medium text-foreground">
                How the current baseline ({formatMoney(baselineQuery.data.monthlyTotal, currency)}/month) is built
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-1 pr-3 font-medium">Line</th>
                      <th scope="col" className="py-1 pr-3 text-right font-medium">Quantity</th>
                      <th scope="col" className="py-1 pr-3 text-right font-medium">Unit price</th>
                      <th scope="col" className="py-1 text-right font-medium">Monthly</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {baselineQuery.data.lines.map(l => (
                      <tr key={l.key}>
                        <td className="py-1 pr-3">
                          {l.label}
                          {l.note ? <span className="block text-muted-foreground">{l.note}</span> : null}
                        </td>
                        <td className="whitespace-nowrap py-1 pr-3 text-right tabular-nums">
                          {l.quantity.toLocaleString('en-GB', { maximumFractionDigits: 2 })} {l.unit}
                        </td>
                        <td className="whitespace-nowrap py-1 pr-3 text-right tabular-nums">{formatUnitPrice(l.unitPrice, currency)}</td>
                        <td className="whitespace-nowrap py-1 text-right tabular-nums">{formatMoney(l.monthly, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : null}

          {assumptions.length > 0 ? (
            <div className="rounded-lg bg-muted/40 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assumptions</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </PanelCard>
  )
}

function NumberField({
  name,
  step,
  value,
  error,
  onChange,
}: {
  name: NumericField
  step: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const rule = ESTIMATE_NUMERIC_RULES[name]
  const id = `azure-calc-${name}`
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rule.label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={rule.min}
        max={rule.max}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        error={!!error}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function TotalTile({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' | 'flat' }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-xl font-bold tabular-nums',
          tone === 'up' && 'text-destructive',
          tone === 'down' && 'text-success',
        )}
      >
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">/month</span>
      </p>
    </div>
  )
}

export function PricesCalculatorTab() {
  return (
    <div className="space-y-4" data-testid="azure-prices">
      <PriceList />
      <WhatIfCalculator />
    </div>
  )
}
