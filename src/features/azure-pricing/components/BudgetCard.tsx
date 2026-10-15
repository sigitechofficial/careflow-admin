import { CheckCircle2, Circle, Target } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { BudgetStatus } from '@/features/azure-pricing/types'
import {
  BUDGET_THRESHOLDS,
  BUDGET_TONE_CLASSES,
  budgetTone,
  clampPercent,
  formatMoney,
  formatPercent,
} from '@/features/azure-pricing/lib/azure-pricing-format'
import { KpiCard } from '@/features/azure-pricing/components/AzurePricingShared'

/** Progress bar with tick marks at the 50/70/85/95 % alert thresholds and a forecast marker. */
export function BudgetBar({
  percentUsed,
  forecastPercent,
  label = 'Budget used',
}: {
  percentUsed: number
  forecastPercent?: number | null
  label?: string
}) {
  const tone = budgetTone(percentUsed)
  const width = clampPercent(percentUsed)
  const forecastPos = forecastPercent != null ? clampPercent(forecastPercent) : null
  return (
    <div className="space-y-1">
      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
        aria-valuetext={`${formatPercent(percentUsed, 0)} of budget used`}
        data-tone={tone}
        data-testid="azure-budget-bar"
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', BUDGET_TONE_CLASSES[tone].bar)}
          style={{ width: `${width}%` }}
        />
        {BUDGET_THRESHOLDS.map(t => (
          <span
            key={t}
            className="absolute top-0 h-full w-px bg-foreground/30"
            style={{ left: `${t}%` }}
            aria-hidden
          />
        ))}
        {forecastPos !== null ? (
          <span
            className="absolute top-0 h-full w-0.5 bg-foreground"
            style={{ left: `calc(${forecastPos}% - 1px)` }}
            title={`Forecast ${formatPercent(forecastPercent, 0)}`}
            aria-hidden
          />
        ) : null}
      </div>
      <div className="relative h-3 text-[10px] text-muted-foreground" aria-hidden>
        {BUDGET_THRESHOLDS.map(t => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${t}%` }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

export function BudgetCard({ budget, currency }: { budget: BudgetStatus | null; currency: string }) {
  if (!budget) {
    return (
      <KpiCard
        label="Budget"
        value={<span className="text-base font-medium text-muted-foreground">No budget found</span>}
        sub="No Azure Consumption budget was found for this subscription or resource group."
        icon={<Target className="h-5 w-5" aria-hidden />}
        testId="azure-kpi-budget"
      />
    )
  }

  const tone = budgetTone(budget.percentUsed)
  const thresholds =
    budget.thresholds?.length > 0
      ? [...budget.thresholds].sort((a, b) => a.percent - b.percent || a.type.localeCompare(b.type))
      : BUDGET_THRESHOLDS.map(percent => ({ percent, type: 'Actual', reached: budget.percentUsed >= percent }))

  return (
    <KpiCard
      label="Budget used"
      value={<span className={BUDGET_TONE_CLASSES[tone].text}>{formatPercent(budget.percentUsed, 0)}</span>}
      sub={
        <>
          {formatMoney(budget.currentSpend, currency)} of {formatMoney(budget.amount, currency)}{' '}
          {budget.timeGrain ? budget.timeGrain.toLowerCase() : ''} budget
          {budget.forecastPercent != null ? ` · forecast ${formatPercent(budget.forecastPercent, 0)}` : ''}
        </>
      }
      icon={<Target className="h-5 w-5" aria-hidden />}
      testId="azure-kpi-budget"
    >
      <BudgetBar percentUsed={budget.percentUsed} forecastPercent={budget.forecastPercent} />
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Budget alert thresholds">
        {thresholds.map(t => (
          <li
            key={`${t.type}-${t.percent}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
              t.reached
                ? cn('border-current/30 bg-muted', BUDGET_TONE_CLASSES[budgetTone(t.percent)].text)
                : 'border-border text-muted-foreground',
            )}
          >
            {t.reached ? (
              <CheckCircle2 className="h-3 w-3" aria-hidden />
            ) : (
              <Circle className="h-3 w-3" aria-hidden />
            )}
            {t.percent}% {String(t.type).toLowerCase() === 'actual' ? '' : `${String(t.type).toLowerCase()} `}
            <span className="sr-only">{t.reached ? 'reached' : 'not reached'}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11px] text-muted-foreground">{budget.name}</p>
    </KpiCard>
  )
}
