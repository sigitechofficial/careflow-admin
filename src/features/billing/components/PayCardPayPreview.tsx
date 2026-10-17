import * as React from 'react'
import { AlertTriangle, Calculator, Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { CollapsibleCard } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { usePayPreview } from '@/features/billing/hooks/useWageTypes'
import { serializePayCardRulesForApi } from '@/features/billing/utils/billing-card-payload.util'
import type { PayCardRule, PayStackingPolicy } from '@/features/billing/types/billing-cards.types'
import type { BankHolidayRegion, PayPreviewResult } from '@/features/billing/types/wage-types.types'

type Props = {
  rules: PayCardRule[]
  stackingPolicy: PayStackingPolicy
  bankHolidayRegion: BankHolidayRegion
}

const METHOD_LABELS: Record<string, string> = {
  BANDED_HOURLY: 'Hourly, split by time band',
  HOURLY: 'Hourly',
  FIXED: 'Fixed per visit',
  PER_VISIT_FEE: 'Fixed per visit',
  SLEEP_IN: 'Sleeping night (per night)',
  WAKING_NIGHT: 'Waking night (hourly)',
}

/** Prices a sample visit with the rates in the form — calculation only, nothing is saved. */
export function PayCardPayPreview({ rules, stackingPolicy, bankHolidayRegion }: Props) {
  const previewMutation = usePayPreview()
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = React.useState('09:00')
  const [endTime, setEndTime] = React.useState('10:00')
  const [nightDuty, setNightDuty] = React.useState<'' | 'SLEEPING_NIGHT' | 'WAKING_NIGHT'>('')
  const [result, setResult] = React.useState<PayPreviewResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const run = async () => {
    setError(null)
    try {
      const data = await previewMutation.mutateAsync({
        rules: serializePayCardRulesForApi(rules),
        stackingPolicy,
        bankHolidayRegion,
        date,
        startTime,
        endTime,
        nightDuty: nightDuty || null,
      })
      setResult(data)
    } catch (err) {
      setResult(null)
      setError(err instanceof ApiError ? err.message : 'Could not calculate the preview.')
    }
  }

  return (
    <CollapsibleCard
      id="pay-card-preview"
      data-testid="pay-card-preview"
      icon={<Calculator className="h-4 w-4" aria-hidden />}
      iconClassName="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
      title="Pay preview"
      description="Try a sample visit with the rates above (including unsaved changes). Uses the same calculation as real visits. Nothing is saved and no pay is created."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-foreground/90">Visit date</span>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="pay-preview-date" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-foreground/90">Start</span>
          <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} data-testid="pay-preview-start" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-foreground/90">End (earlier = next day)</span>
          <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} data-testid="pay-preview-end" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs font-medium text-foreground/90">Visit type</span>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={nightDuty}
            onChange={e => setNightDuty(e.target.value as typeof nightDuty)}
          >
            <option value="">Care visit</option>
            <option value="SLEEPING_NIGHT">Sleeping night</option>
            <option value="WAKING_NIGHT">Waking night</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button
            type="button"
            className="w-full"
            leftIcon={previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            onClick={() => void run()}
            disabled={previewMutation.isPending || !date || !startTime || !endTime}
            data-testid="pay-preview-run"
          >
            Calculate
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {result ? (
        <div className="space-y-3" data-testid="pay-preview-result">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {result.amount != null ? `£${result.amount.toFixed(2)}` : 'Rate missing'}
            </p>
            <p className="text-sm text-muted-foreground">
              {result.minutes} min · {result.method ? (METHOD_LABELS[result.method] ?? result.method) : '—'}
              {result.bankHolidays.length
                ? ` · Bank holiday: ${result.bankHolidays.map(h => h.name).join(', ')}`
                : ''}
            </p>
          </div>

          {result.warnings.map(w => (
            <p
              key={w}
              className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {w}
            </p>
          ))}

          {result.segments.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Time</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Rate used</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Calculation</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {result.segments.map((s, i) => (
                    <tr key={`${s.startLabel}-${i}`} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {s.startLabel}–{s.endLabel}
                      </td>
                      <td className="px-3 py-2">{s.ruleLabel ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.lineFormula ?? s.explanation}</td>
                      <td className="px-3 py-2 text-right tabular-nums">£{s.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </CollapsibleCard>
  )
}
