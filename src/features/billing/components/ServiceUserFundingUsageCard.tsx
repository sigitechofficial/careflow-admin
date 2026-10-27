import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, PoundSterling } from 'lucide-react'
import { useServiceUserFundingUsage } from '@/features/billing/hooks/useFundingUsage'
import type { FundingUsage, FundingUsagePeriod } from '@/features/billing/types/funding-usage.types'
import { SectionInfoTip } from '@/features/billing/components/SectionInfoTip'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { ContentCard } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'

const money = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)
const hours = (value: number) => `${Number(value.toFixed(2))} h`

/** Same day a week (or a month) earlier / later; a month step keeps the 1st so short months never skip. */
function stepPeriod(date: string, period: FundingUsagePeriod, direction: 1 | -1): string {
  const [y = 1970, m = 1, d = 1] = date.split('-').map(Number)
  const next =
    period === 'week' ? new Date(Date.UTC(y, m - 1, d + 7 * direction)) : new Date(Date.UTC(y, m - 1 + direction, 1))
  return next.toISOString().slice(0, 10)
}

function Breakdown({ rows }: { rows: { label: string; value: number }[] }) {
  return (
    <dl className="space-y-1 text-sm">
      {rows.map(row => (
        <div key={row.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium tabular-nums">{money(row.value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function BudgetBlock({ usage }: { usage: FundingUsage }) {
  const { amount, remaining } = usage.budget
  if (amount == null) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Funding budget</p>
        <p className="text-sm text-muted-foreground">
          No weekly budget (or authorised hours with an hourly rate) on this service user’s funding lines, so there is
          nothing to measure against. Add it on the Funding tab.
        </p>
      </div>
    )
  }
  const used = amount > 0 ? Math.min(100, (usage.clientCharge.total / amount) * 100) : 100
  const over = remaining != null && remaining < 0
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Funding budget</p>
        <p className="text-lg font-semibold tabular-nums">{money(amount)}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={cn('h-full rounded-full', over ? 'bg-destructive' : 'bg-primary')} style={{ width: `${used}%` }} />
      </div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Charged {money(usage.clientCharge.total)}</span>
        <span className={cn('font-semibold tabular-nums', over ? 'text-destructive' : 'text-primary')} data-testid="funding-usage-remaining">
          {over ? `Over by ${money(Math.abs(remaining))}` : `Remaining ${money(remaining ?? 0)}`}
        </span>
      </div>
      {usage.budget.lines.length > 1 ? (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {usage.budget.lines.map((line, i) => (
            <li key={`${line.funderName}-${i}`} className="flex justify-between gap-3">
              <span>{line.funderName ?? line.fundingTypeName ?? 'Funding line'}</span>
              <span className="tabular-nums">{line.budget != null ? money(line.budget) : '—'}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * For one service user, in a week or a month: what their visits cost in carer pay, what is
 * charged to the funders, and how much of the funding budget is left.
 */
export function ServiceUserFundingUsageCard({ serviceUserId }: { serviceUserId: string }) {
  const { formatDate } = useOrganisationDisplayFormat()
  const [period, setPeriod] = React.useState<FundingUsagePeriod>('month')
  const [date, setDate] = React.useState(() => operationalTodayIso())
  const query = useServiceUserFundingUsage(serviceUserId, { period, date })
  const usage = query.data

  const periodLabel = usage
    ? usage.period.kind === 'month'
      ? new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
          new Date(`${usage.period.from}T00:00:00Z`),
        )
      : `${formatDate(usage.period.from)} – ${formatDate(usage.period.to)}`
    : '…'

  return (
    <TooltipProvider delayDuration={150}>
      <ContentCard className="space-y-4 p-4" data-testid="service-user-funding-usage">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <PoundSterling className="h-4 w-4 text-muted-foreground" aria-hidden />
            Funding and carer pay
            <SectionInfoTip label="Funding and carer pay">
              From this service user’s visits in the period. Charge is what the funders are billed; carer pay is what the
              carers earn for these visits. Pending review means the visit is priced but not approved yet. Budget is each
              funding line’s weekly budget spread over its days in the period.
            </SectionInfoTip>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Period">
              {(['week', 'month'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  aria-pressed={period === p}
                  className={cn(
                    'rounded px-3 py-1 text-sm font-medium',
                    period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                  data-testid={`funding-usage-period-${p}`}
                >
                  {p === 'week' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              aria-label={`Previous ${period}`}
              onClick={() => setDate(d => stepPeriod(d, period, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[10rem] text-center text-sm font-medium tabular-nums" data-testid="funding-usage-period-label">
              {periodLabel}
            </span>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              aria-label={`Next ${period}`}
              onClick={() => setDate(d => stepPeriod(d, period, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDate(operationalTodayIso())}>
              {period === 'week' ? 'This week' : 'This month'}
            </Button>
          </div>
        </div>

        {query.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : query.isError || !usage ? (
          <p className="text-sm text-destructive">Could not load funding and pay figures.</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <BudgetBlock usage={usage} />
              </div>
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">Charged to funders</p>
                  <p className="text-lg font-semibold tabular-nums">{money(usage.clientCharge.total)}</p>
                </div>
                <Breakdown
                  rows={[
                    { label: 'Invoiced', value: usage.clientCharge.invoiced },
                    { label: 'Approved, not invoiced', value: usage.clientCharge.toInvoice },
                    { label: 'Pending review', value: usage.clientCharge.pending },
                  ]}
                />
              </div>
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">Paid to carers</p>
                  <p className="text-lg font-semibold tabular-nums" data-testid="funding-usage-carer-pay">
                    {money(usage.carerPay.total)}
                  </p>
                </div>
                <Breakdown
                  rows={[
                    { label: 'Paid (in a pay run)', value: usage.carerPay.paid },
                    { label: 'Approved, still to pay', value: usage.carerPay.due },
                    { label: 'Pending review', value: usage.carerPay.pending },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                <span>
                  Visits <span className="font-medium text-foreground tabular-nums">{usage.visits}</span>
                  {usage.pendingReview > 0 ? ` (${usage.pendingReview} pending review)` : ''}
                </span>
                <span>
                  Hours charged <span className="font-medium text-foreground tabular-nums">{hours(usage.billableHours)}</span>
                  {usage.budget.hours != null
                    ? ` of ${hours(usage.budget.hours)} authorised${
                        usage.budget.hoursRemaining != null && usage.budget.hoursRemaining < 0
                          ? ` (over by ${hours(Math.abs(usage.budget.hoursRemaining))})`
                          : ` (${hours(usage.budget.hoursRemaining ?? 0)} left)`
                      }`
                    : ''}
                </span>
                <span>
                  Margin{' '}
                  <span className={cn('font-medium tabular-nums', usage.margin < 0 ? 'text-destructive' : 'text-foreground')}>
                    {money(usage.margin)}
                  </span>
                </span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/billing/visit-reconciliation" search={{ serviceUserId }} className="inline-flex items-center gap-1">
                  View visits
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
          </>
        )}
      </ContentCard>
    </TooltipProvider>
  )
}
