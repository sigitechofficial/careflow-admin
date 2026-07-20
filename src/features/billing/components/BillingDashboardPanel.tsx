import * as React from 'react'
import { AlertTriangle, ArrowRight, FileText, Info, PoundSterling, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { SparklineCard } from '@/shared/ui/sparkline-card'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { BILLING_DASHBOARD_STATS } from '@/features/billing/data/billing-mock.data'
import { BillingExceptionBadge } from '@/features/billing/components/BillingStatusBadge'
import { useFundingContractsSummary } from '@/features/billing/hooks/useFundingContracts'
import {
  useVisitReconciliationExceptionQueue,
  useVisitReconciliationsSummary,
} from '@/features/billing/hooks/useVisitReconciliations'
import { usePayrollRunsSummary } from '@/features/billing/hooks/usePayrollRuns'
import { useInvoiceRunsSummary } from '@/features/billing/hooks/useInvoiceRuns'
import { usePaymentsSummary } from '@/features/billing/hooks/usePayments'

function DashboardHelpIcon({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`About ${label}`}
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm text-left text-xs leading-snug">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function DashboardSectionTitle({ title, tooltip }: { title: string; tooltip: string }) {
  return (
    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
      {title}
      <DashboardHelpIcon label={title} tooltip={tooltip} />
    </h3>
  )
}

export function BillingDashboardPanel() {
  const summaryQuery = useFundingContractsSummary()
  const visitSummaryQuery = useVisitReconciliationsSummary()
  const payrollSummaryQuery = usePayrollRunsSummary()
  const invoiceSummaryQuery = useInvoiceRunsSummary()
  const paymentsSummaryQuery = usePaymentsSummary()
  const exceptionQueueQuery = useVisitReconciliationExceptionQueue(10)
  const stats = {
    ...BILLING_DASHBOARD_STATS,
    missingFundingContracts:
      summaryQuery.data?.missingFundingContracts ?? BILLING_DASHBOARD_STATS.missingFundingContracts,
    visitsReady: visitSummaryQuery.data?.visitsReady ?? BILLING_DASHBOARD_STATS.visitsReady,
    visitsWithExceptions:
      visitSummaryQuery.data?.visitsWithExceptions ?? BILLING_DASHBOARD_STATS.visitsWithExceptions,
    payrollDrafts: payrollSummaryQuery.data?.payrollDrafts ?? BILLING_DASHBOARD_STATS.payrollDrafts,
    invoiceDrafts: invoiceSummaryQuery.data?.invoiceDrafts ?? BILLING_DASHBOARD_STATS.invoiceDrafts,
    unmatchedPayments:
      paymentsSummaryQuery.data?.unmatchedPayments ?? BILLING_DASHBOARD_STATS.unmatchedPayments,
    overdueInvoices:
      paymentsSummaryQuery.data?.overdueInvoices ?? BILLING_DASHBOARD_STATS.overdueInvoices,
  }
  const exceptionQueue = exceptionQueueQuery.data ?? []

  return (
    <TooltipProvider delayDuration={200}>
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
            tooltip="Completed visits approved for pay and/or invoice. These are ready to include in payroll and invoice runs for the relevant period."
          />
          <SparklineCard
            title="Visits with exceptions"
            value={stats.visitsWithExceptions}
            change={-8.1}
            data={[{ value: 24 }, { value: 22 }, { value: 20 }, { value: 19 }, { value: 18 }]}
            color="var(--color-warning)"
            tooltip="Visit reconciliations with unresolved finance exceptions — for example missing pay card, charge card, or funding contract. Fix setup or times before approving."
          />
          <SparklineCard
            title="Overdue invoices"
            value={stats.overdueInvoices}
            change={2.5}
            data={[{ value: 9 }, { value: 10 }, { value: 11 }, { value: 11 }, { value: 12 }]}
            color="var(--color-destructive)"
            tooltip="Number of locked or sent invoice runs with an unpaid balance overdue by more than 7 days. Review on the Payments tab aged debt section."
          />
          <SparklineCard
            title="Unmatched payments"
            value={stats.unmatchedPayments}
            data={[{ value: 6 }, { value: 5 }, { value: 5 }, { value: 4 }, { value: 4 }]}
            tooltip="Payments received but not fully matched to invoice runs — either wholly unmatched or partially allocated with a remaining balance."
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ContentCard className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <DashboardSectionTitle
                title="Exception queue"
                tooltip="Open finance exceptions from visit reconciliation. Each row is a visit that cannot bill cleanly until the issue is resolved — click Review visits to work through them."
              />
              <Button variant="outline" size="sm" asChild>
                <Link to="/billing/visit-reconciliation">
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
                  {exceptionQueue.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                        No open finance exceptions.
                      </td>
                    </tr>
                  ) : (
                    exceptionQueue.map(row => (
                      <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2.5">
                          <BillingExceptionBadge
                            code={row.code}
                            message={row.message}
                            serviceUserId={row.serviceUserId}
                            employeeId={row.employeeId}
                            scheduledJobId={row.scheduledJobId}
                          />
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">{row.visitRef}</td>
                        <td className="px-3 py-2.5">{row.serviceUser}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{row.message}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </ContentCard>

          <ContentCard className="space-y-4">
            <DashboardSectionTitle
              title="Quick actions"
              tooltip="Shortcuts to the main billing workflows — payroll for carers, invoices for funders, setup gaps, and payment matching."
            />
            <ul className="space-y-2">
              <li>
                <Link
                  to="/billing/payroll-runs"
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
                >
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium">
                      Payroll drafts
                      <DashboardHelpIcon
                        label="Payroll drafts"
                        tooltip="Payroll runs still in draft, calculating, exception, or ready-for-review status. Calculate and approve before locking for export."
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stats.payrollDrafts} run awaiting review
                    </span>
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  to="/billing/invoice-runs"
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
                >
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium">
                      Invoice drafts
                      <DashboardHelpIcon
                        label="Invoice drafts"
                        tooltip="Invoice runs not yet locked or sent. Pulls approved billable visits for a period and applies funder funding splits."
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stats.invoiceDrafts} runs in progress
                    </span>
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
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium">
                      Setup gaps
                      <DashboardHelpIcon
                        label="Setup gaps"
                        tooltip="Service users missing pay cards, charge cards, or active funding contracts needed for clean billing. Incomplete setup creates exceptions instead of silent charges."
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stats.missingRateCards} rate cards · {stats.missingFundingContracts} contracts
                    </span>
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  to="/billing/payments"
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
                >
                  <PoundSterling className="h-4 w-4 text-primary shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium">
                      Credit control
                      <DashboardHelpIcon
                        label="Credit control"
                        tooltip="Record bank transfers and council remittances, match them to locked invoice runs, and track aged debt by overdue bucket."
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {stats.unmatchedPayments} unmatched payments
                    </span>
                  </span>
                </Link>
              </li>
            </ul>
          </ContentCard>
        </div>

        <ContentCard className="bg-muted/20 border-dashed">
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <span className="flex-1">
              <strong className="text-foreground">Core rule:</strong> completed and approved visits are the finance
              source. Carer pay and client/funder invoice are calculated separately. Missing setup creates exceptions —
              never silent billing.
            </span>
            <DashboardHelpIcon
              label="Core billing rule"
              tooltip="Every charge and pay line must trace back to a completed visit with approved times. Payroll and invoicing are separate runs. If rates or funding are missing, the system flags an exception rather than guessing an amount."
            />
          </p>
        </ContentCard>
      </div>
    </TooltipProvider>
  )
}
