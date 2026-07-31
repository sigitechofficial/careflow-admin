import * as React from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  FileText,
  Info,
  LayoutDashboard,
  Link2,
  PoundSterling,
  Receipt,
  Scale,
  ShieldAlert,
  Users,
  Wallet,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'
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
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'

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

function DashboardStatCard({
  title,
  value,
  hint,
  icon,
  iconClassName,
  tooltip,
  loading,
  to,
  search,
}: {
  title: string
  value: number
  hint: string
  icon: React.ReactNode
  iconClassName: string
  tooltip: string
  loading?: boolean
  to: string
  search?: Record<string, string>
}) {
  return (
    <Link
      to={to}
      search={search}
      className="group rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <span className="truncate">{title}</span>
            <DashboardHelpIcon label={title} tooltip={tooltip} />
          </p>
          <p className="text-2xl font-display font-bold tabular-nums text-foreground">
            {loading ? '—' : value}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <span
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
            iconClassName,
          )}
        >
          {icon}
        </span>
      </div>
    </Link>
  )
}

function DashboardSectionHeading({
  icon,
  iconClassName,
  title,
  tooltip,
}: {
  icon: React.ReactNode
  iconClassName: string
  title: string
  tooltip: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          iconClassName,
        )}
      >
        {icon}
      </span>
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        {title}
        <DashboardHelpIcon label={title} tooltip={tooltip} />
      </h3>
    </div>
  )
}

function QuickActionLink({
  to,
  search,
  icon,
  iconClassName,
  title,
  tooltip,
  detail,
}: {
  to: string
  search?: Record<string, string>
  icon: React.ReactNode
  iconClassName: string
  title: string
  tooltip: string
  detail: string
}) {
  return (
    <Link
      to={to}
      search={search}
      className="group flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-sm transition-colors hover:border-primary/30 hover:bg-muted/30"
    >
      <span
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          iconClassName,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 font-medium text-foreground">
          {title}
          <DashboardHelpIcon label={title} tooltip={tooltip} />
        </span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        aria-hidden
      />
    </Link>
  )
}

export function BillingDashboardPanel() {
  const { locationId } = useGlobalLocationScope()
  const summaryQuery = useFundingContractsSummary()
  const visitSummaryQuery = useVisitReconciliationsSummary(locationId)
  const payrollSummaryQuery = usePayrollRunsSummary(locationId)
  const invoiceSummaryQuery = useInvoiceRunsSummary(locationId)
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
  const visitLoading = visitSummaryQuery.isLoading
  const paymentsLoading = paymentsSummaryQuery.isLoading

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <ContentSectionHeader
          icon={<LayoutDashboard className="h-5 w-5" aria-hidden />}
          iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
          title="Billing dashboard"
          description="Visits ready for finance, open exceptions, draft runs, and credit control — at a glance."
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            title="Visits ready"
            value={stats.visitsReady}
            hint="Approved for pay / invoice"
            loading={visitLoading}
            icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
            iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            tooltip="Completed visits approved for pay and/or invoice. Ready to include in payroll and invoice runs."
            to="/billing/visit-reconciliation"
          />
          <DashboardStatCard
            title="Exceptions"
            value={stats.visitsWithExceptions}
            hint="Need attention before billing"
            loading={visitLoading}
            icon={<CircleAlert className="h-5 w-5" aria-hidden />}
            iconClassName="bg-amber-500/10 text-amber-800 dark:text-amber-300"
            tooltip="Visit reconciliations with unresolved finance exceptions — missing cards, funding, or times."
            to="/billing/visit-reconciliation"
          />
          <DashboardStatCard
            title="Overdue invoices"
            value={stats.overdueInvoices}
            hint="Unpaid over 7 days"
            loading={paymentsLoading}
            icon={<Receipt className="h-5 w-5" aria-hidden />}
            iconClassName="bg-rose-500/10 text-rose-700 dark:text-rose-300"
            tooltip="Locked or sent invoice runs with an unpaid balance overdue by more than 7 days."
            to="/billing/payments"
          />
          <DashboardStatCard
            title="Unmatched payments"
            value={stats.unmatchedPayments}
            hint="Received, not fully linked"
            loading={paymentsLoading}
            icon={<Link2 className="h-5 w-5" aria-hidden />}
            iconClassName="bg-violet-500/10 text-violet-700 dark:text-violet-300"
            tooltip="Payments received but not fully matched to invoice runs."
            to="/billing/payments"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ContentCard className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <DashboardSectionHeading
                icon={<ShieldAlert className="h-4 w-4" aria-hidden />}
                iconClassName="bg-amber-500/10 text-amber-800 dark:text-amber-300"
                title="Exception queue"
                tooltip="Open finance exceptions from visit reconciliation. Resolve these before approving pay or invoices."
              />
              <Button variant="outline" size="sm" asChild>
                <Link to="/billing/visit-reconciliation" className="inline-flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                  Review visits
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </div>

            {exceptionQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-sm font-medium text-foreground">No open finance exceptions</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Visits are clearing cleanly. New issues will appear here when setup or times need a fix.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
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
                    {exceptionQueue.map(row => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCard>

          <ContentCard className="space-y-4">
            <DashboardSectionHeading
              icon={<Scale className="h-4 w-4" aria-hidden />}
              iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
              title="Quick actions"
              tooltip="Shortcuts to payroll, invoices, setup gaps, and payment matching."
            />
            <ul className="space-y-2">
              <li>
                <QuickActionLink
                  to="/billing/payroll-runs"
                  icon={<Users className="h-4 w-4" aria-hidden />}
                  iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  title="Payroll drafts"
                  tooltip="Payroll runs still in draft or ready for review. Calculate and approve before locking for export."
                  detail={`${stats.payrollDrafts} run${stats.payrollDrafts === 1 ? '' : 's'} awaiting review`}
                />
              </li>
              <li>
                <QuickActionLink
                  to="/billing/invoice-runs"
                  icon={<FileText className="h-4 w-4" aria-hidden />}
                  iconClassName="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                  title="Invoice drafts"
                  tooltip="Invoice runs not yet locked or sent. Pulls approved billable visits for a period."
                  detail={`${stats.invoiceDrafts} run${stats.invoiceDrafts === 1 ? '' : 's'} in progress`}
                />
              </li>
              <li>
                <QuickActionLink
                  to="/billing"
                  search={{ tab: 'funding-contracts' }}
                  icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
                  iconClassName="bg-amber-500/10 text-amber-800 dark:text-amber-300"
                  title="Setup gaps"
                  tooltip="Service users missing pay cards, charge cards, or funding contracts needed for clean billing."
                  detail={`${stats.missingRateCards} rate cards · ${stats.missingFundingContracts} contracts`}
                />
              </li>
              <li>
                <QuickActionLink
                  to="/billing/payments"
                  icon={<Wallet className="h-4 w-4" aria-hidden />}
                  iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  title="Credit control"
                  tooltip="Record remittances, match them to invoices, and track aged debt."
                  detail={`${stats.unmatchedPayments} unmatched payment${stats.unmatchedPayments === 1 ? '' : 's'}`}
                />
              </li>
            </ul>
          </ContentCard>
        </div>

        <ContentCard className="border-dashed bg-muted/15">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PoundSterling className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                Core billing rule
                <DashboardHelpIcon
                  label="Core billing rule"
                  tooltip="Every charge and pay line must trace back to a completed visit with approved times. Payroll and invoicing are separate runs. Missing rates or funding create exceptions rather than silent amounts."
                />
              </p>
              <p className="text-sm text-muted-foreground">
                Completed and approved visits are the finance source. Carer pay and client/funder invoice are
                calculated separately. Missing setup creates exceptions — never silent billing.
              </p>
            </div>
          </div>
        </ContentCard>
      </div>
    </TooltipProvider>
  )
}
