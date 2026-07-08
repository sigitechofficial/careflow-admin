import * as React from 'react'
import { AlertTriangle, ArrowRight, FileText, PoundSterling, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { SparklineCard } from '@/shared/ui/sparkline-card'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import {
  BILLING_DASHBOARD_STATS,
  BILLING_EXCEPTION_QUEUE,
} from '@/features/billing/data/billing-mock.data'
import { BillingExceptionBadge } from '@/features/billing/components/BillingStatusBadge'
import { useFundingContractsSummary } from '@/features/billing/hooks/useFundingContracts'

export function BillingDashboardPanel() {
  const summaryQuery = useFundingContractsSummary()
  const stats = {
    ...BILLING_DASHBOARD_STATS,
    missingFundingContracts:
      summaryQuery.data?.missingFundingContracts ?? BILLING_DASHBOARD_STATS.missingFundingContracts,
  }

  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Billing dashboard"
        description="Overview of visits ready for finance, open exceptions, draft runs, and credit control items."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SparklineCard
          title="Visits ready for billing"
          value={stats.visitsReady}
          change={4.2}
          data={[{ value: 120 }, { value: 128 }, { value: 131 }, { value: 138 }, { value: 142 }]}
        />
        <SparklineCard
          title="Visits with exceptions"
          value={stats.visitsWithExceptions}
          change={-8.1}
          data={[{ value: 24 }, { value: 22 }, { value: 20 }, { value: 19 }, { value: 18 }]}
          color="var(--color-warning)"
        />
        <SparklineCard
          title="Overdue invoices"
          value={stats.overdueInvoices}
          prefix="£"
          change={2.5}
          data={[{ value: 9 }, { value: 10 }, { value: 11 }, { value: 11 }, { value: 12 }]}
          color="var(--color-destructive)"
        />
        <SparklineCard
          title="Unmatched payments"
          value={stats.unmatchedPayments}
          data={[{ value: 6 }, { value: 5 }, { value: 5 }, { value: 4 }, { value: 4 }]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ContentCard className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Exception queue</h3>
            <Button variant="outline" size="sm" asChild>
              <Link to="/billing" search={{ tab: 'visit-reconciliation' }}>
                Review visits
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Exception</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Service user</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Message</th>
                </tr>
              </thead>
              <tbody>
                {BILLING_EXCEPTION_QUEUE.map(row => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <BillingExceptionBadge code={row.code} />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{row.visitRef}</td>
                    <td className="px-3 py-2.5">{row.serviceUser}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContentCard>

        <ContentCard className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Quick actions</h3>
          <ul className="space-y-2">
            <li>
              <Link
                to="/billing"
                search={{ tab: 'payroll-runs' }}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
              >
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <span className="font-medium block">Payroll drafts</span>
                  <span className="text-xs text-muted-foreground">{stats.payrollDrafts} run awaiting review</span>
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/billing"
                search={{ tab: 'invoice-runs' }}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
              >
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <span className="font-medium block">Invoice drafts</span>
                  <span className="text-xs text-muted-foreground">{stats.invoiceDrafts} runs in progress</span>
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/billing"
                search={{ tab: 'funding-contracts' }}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
              >
                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                <span>
                  <span className="font-medium block">Setup gaps</span>
                  <span className="text-xs text-muted-foreground">
                    {stats.missingRateCards} rate cards · {stats.missingFundingContracts} contracts
                  </span>
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/billing"
                search={{ tab: 'payments' }}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
              >
                <PoundSterling className="h-4 w-4 text-primary shrink-0" />
                <span>
                  <span className="font-medium block">Credit control</span>
                  <span className="text-xs text-muted-foreground">{stats.unmatchedPayments} unmatched payments</span>
                </span>
              </Link>
            </li>
          </ul>
        </ContentCard>
      </div>

      <ContentCard className="bg-muted/20 border-dashed">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Core rule:</strong> completed and approved visits are the finance source.
          Carer pay and client/funder invoice are calculated separately. Missing setup creates exceptions — never silent billing.
        </p>
      </ContentCard>
    </div>
  )
}
