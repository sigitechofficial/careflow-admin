import * as React from 'react'
import { ExternalLink, Loader2, Send } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import {
  useSendInvoiceRun,
  useServiceUserInvoices,
} from '@/features/billing/hooks/useInvoiceRuns'
import { useResolveServiceUserInvoiceTemplate } from '@/features/billing/hooks/useInvoiceTemplates'
import { InvoiceRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'

function StatCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string | number
  hint: string
}) {
  return (
    <ContentCard className="space-y-1 p-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </ContentCard>
  )
}

export function ServiceUserEditInvoicesPanel({ serviceUserId }: { serviceUserId: string }) {
  const canRead = useAuthStore(
    s =>
      s.can('service_users.read') ||
      s.can('service_users.update') ||
      s.can('billing.invoice_runs.read' as never),
  )
  const canManage = useAuthStore(s => s.can('billing.invoice_runs.manage' as never))
  const canOpenBilling = useAuthStore(s => s.can('billing.invoice_runs.read' as never))

  const invoicesQuery = useServiceUserInvoices(serviceUserId, canRead)
  const templateQuery = useResolveServiceUserInvoiceTemplate(serviceUserId, undefined, canRead)
  const sendMutation = useSendInvoiceRun()

  const data = invoicesQuery.data
  const runs = data?.runs ?? []
  const resolvedTemplate = templateQuery.data?.invoiceTemplate
  const templateSource = templateQuery.data?.source

  const handleSend = async (runId: string, period: string) => {
    const confirmed = window.confirm(
      `Mark invoice run "${period}" as sent to funders?\n\nThis marks the whole run as sent (including any other service users on the same run).`,
    )
    if (!confirmed) return
    try {
      await sendMutation.mutateAsync(runId)
      toastSuccess('Invoice run marked as sent to funders.')
      void invoicesQuery.refetch()
    } catch (err) {
      toastApiError(err, 'Could not send invoice run.')
    }
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view invoices for this service user.
      </p>
    )
  }

  return (
    <div className="space-y-6" data-testid="service-user-invoices-panel">
      <ContentSectionHeader
        title="Invoices"
        description="Invoice runs that include this service user, with funder totals. Send locked runs to funders from here or open the full invoice run."
        action={
          canOpenBilling ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/billing/invoice-runs">
                All invoice runs
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null
        }
      />

      {invoicesQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invoices…
        </div>
      ) : invoicesQuery.isError ? (
        <p className="text-sm text-destructive">Could not load invoices for this service user.</p>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total invoiced"
              value={data.totalInvoiced}
              hint="Locked / sent runs for this client"
            />
            <StatCard
              title="Invoice runs"
              value={data.runCount}
              hint="Runs containing this service user"
            />
            <StatCard
              title="Ready to invoice"
              value={data.readyToInvoiceCount}
              hint="Approved visits not yet on an invoice run"
            />
            <StatCard
              title="Invoice template"
              value={
                resolvedTemplate?.name
                  ? resolvedTemplate.name
                  : templateQuery.isLoading
                    ? '…'
                    : 'Not set'
              }
              hint={
                templateSource && templateSource !== 'NONE'
                  ? `Resolved via ${templateSource.replace(/_/g, ' ').toLowerCase()}`
                  : 'Assign on Funding tab'
              }
            />
          </div>

          {data.readyToInvoiceCount > 0 ? (
            <ContentCard className="border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              {data.readyToInvoiceCount} approved visit
              {data.readyToInvoiceCount === 1 ? '' : 's'} ready to invoice. Create or calculate an
              invoice run under Billing → Invoice runs for the billing period.
            </ContentCard>
          ) : null}

          <ContentCard className="space-y-3 p-4">
            <h3 className="text-sm font-semibold text-foreground">Invoice runs for funders</h3>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invoice runs include this service user yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Period
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Funders
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Lines
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        This client
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Sent
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map(run => (
                      <React.Fragment key={run.id}>
                        <tr className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2.5">
                            <div className="font-medium">{run.period}</div>
                            <div className="text-xs text-muted-foreground">
                              {run.periodStart} → {run.periodEnd}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <InvoiceRunStatusBadge status={run.status} />
                          </td>
                          <td className="px-3 py-2.5">
                            {run.funderSummaries.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <ul className="space-y-0.5 text-xs">
                                {run.funderSummaries.map(f => (
                                  <li key={f.funderId ?? f.funderName}>
                                    <span className="font-medium text-foreground">
                                      {f.funderName}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {' '}
                                      · {f.subtotal} ({f.lineCount} line
                                      {f.lineCount === 1 ? '' : 's'})
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{run.lineCount}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                            {run.subtotal}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                            {run.sentAt
                              ? new Date(run.sentAt).toLocaleDateString('en-GB')
                              : '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-2">
                              {canOpenBilling ? (
                                <Button variant="outline" size="sm" asChild>
                                  <Link
                                    to="/billing/invoice-runs/$invoiceRunId"
                                    params={{ invoiceRunId: run.id }}
                                  >
                                    Open run
                                  </Link>
                                </Button>
                              ) : null}
                              {canManage && run.canSend ? (
                                <Button
                                  size="sm"
                                  disabled={sendMutation.isPending}
                                  onClick={() => void handleSend(run.id, run.period)}
                                >
                                  <Send className="mr-1.5 h-3.5 w-3.5" />
                                  Send to funders
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCard>
        </>
      ) : null}
    </div>
  )
}
