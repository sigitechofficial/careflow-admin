import * as React from 'react'
import { CheckCircle2, ExternalLink, Eye, Loader2, Send } from 'lucide-react'
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
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

type InvoiceRunRow = NonNullable<
  ReturnType<typeof useServiceUserInvoices>['data']
>['runs'][number]

function PaymentBadge({ status }: { status: 'UNPAID' | 'PART_PAID' | 'PAID' }) {
  if (status === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Paid
      </span>
    )
  }
  if (status === 'PART_PAID') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
        Part paid
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Unpaid
    </span>
  )
}

function InvoiceDetailDialog({
  run,
  serviceUserName,
  onOpenChange,
}: {
  run: InvoiceRunRow | null
  serviceUserName: string
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={run !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{run ? `Invoice — ${run.period}` : 'Invoice'}</DialogTitle>
        </DialogHeader>
        {run ? (
          <DialogBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">{serviceUserName}</span>
              <InvoiceRunStatusBadge status={run.status} />
              {run.sent ? <PaymentBadge status={run.paymentStatus} /> : null}
              <span className="text-muted-foreground">
                {run.periodStart} → {run.periodEnd}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">This client</p>
                <p className="text-lg font-semibold tabular-nums">{run.subtotal}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Invoice total</p>
                <p className="text-lg font-semibold tabular-nums">{run.runNetTotal}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Paid</p>
                <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {run.paid}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Outstanding</p>
                <p className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {run.outstanding}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px] text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Visit</th>
                    <th className="px-3 py-2 text-left font-medium">Funder</th>
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium">Mins</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {run.lines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                        No invoice lines for this client on this run.
                      </td>
                    </tr>
                  ) : (
                    run.lines.map((line) => (
                      <tr key={line.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2 font-medium">{line.visitRef ?? '—'}</td>
                        <td className="px-3 py-2">{line.funderName}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {line.description}
                          {line.exceptionMessage ? (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                              · {line.exceptionMessage}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{line.minutes ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{line.amount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </DialogBody>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

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
  const [selectedRun, setSelectedRun] = React.useState<InvoiceRunRow | null>(null)

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
                        Payment
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
                            {run.sent ? (
                              <div className="space-y-0.5">
                                <PaymentBadge status={run.paymentStatus} />
                                <p className="text-[11px] text-muted-foreground">
                                  {run.paymentStatus === 'PAID'
                                    ? `Paid ${run.paid}`
                                    : `${run.paid} paid · ${run.outstanding} due`}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedRun(run)}
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                Detail
                              </Button>
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

      <InvoiceDetailDialog
        run={selectedRun}
        serviceUserName={data?.serviceUserName ?? ''}
        onOpenChange={(open) => {
          if (!open) setSelectedRun(null)
        }}
      />
    </div>
  )
}
