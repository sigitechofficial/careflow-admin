import * as React from 'react'
import { ArrowRight, FileText, Link2, Loader2, Plus, Wallet } from 'lucide-react'
import { ContentSectionHeader, ContentCard } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { RecordPaymentDialog, type RecordPaymentPrefill } from '@/features/billing/components/RecordPaymentDialog'
import { MatchPaymentDialog } from '@/features/billing/components/MatchPaymentDialog'
import {
  useOutstandingInvoiceRuns,
  usePayments,
} from '@/features/billing/hooks/usePayments'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import type { PaymentRow } from '@/features/billing/api/payments.api'
import {
  formatMoneyGbp,
  parseMoney,
  paymentLinkSummary,
  matchStatusVariant,
} from '@/features/billing/utils/payment-display.util'

function needsLinking(row: PaymentRow): boolean {
  return row.recordStatus === 'RECEIVED' && row.matchStatus !== 'FULLY_MATCHED'
}

export function BillingPaymentsPanel() {
  const canRead = useAuthStore(s => s.can('billing.payments.read' as never))
  const canManage = useAuthStore(s => s.can('billing.payments.manage' as never))
  const { locationId } = useGlobalLocationScope()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [recordPrefill, setRecordPrefill] = React.useState<RecordPaymentPrefill | null>(null)
  const [matchPayment, setMatchPayment] = React.useState<PaymentRow | null>(null)

  const paymentsQuery = usePayments({ locationId: locationId ?? undefined })
  const outstandingQuery = useOutstandingInvoiceRuns(true, locationId)

  const payments = paymentsQuery.data ?? []
  const outstanding = outstandingQuery.data ?? []

  const totalDue = outstanding.reduce((sum, inv) => sum + parseMoney(inv.outstanding), 0)
  const paymentsNeedingLink = payments.filter(needsLinking)
  const totalUnlinked = paymentsNeedingLink.reduce((sum, p) => sum + parseMoney(p.unmatched), 0)

  const openRecord = (prefill?: RecordPaymentPrefill) => {
    setRecordPrefill(prefill ?? null)
    setCreateOpen(true)
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view payments. Required:{' '}
        <span className="font-mono text-xs">billing.payments.read</span>.
      </p>
    )
  }

  const isLoading = paymentsQuery.isLoading || outstandingQuery.isLoading

  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Payments"
        titleClassName="sr-only"
        action={
          canManage ? (
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => openRecord()}>
              Record payment
            </Button>
          ) : null
        }
      />

      <ContentCard className="bg-muted/20 border-dashed p-4">
        <ol className="grid gap-3 text-sm sm:grid-cols-3">
          <li className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </span>
            <span>
              <strong className="text-foreground">Invoice sent</strong>
              <span className="block text-xs text-muted-foreground">
                Lock & send an invoice run in Invoice runs.
              </span>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              2
            </span>
            <span>
              <strong className="text-foreground">Money arrives</strong>
              <span className="block text-xs text-muted-foreground">
                Record the bank transfer or remittance reference.
              </span>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              3
            </span>
            <span>
              <strong className="text-foreground">Link to invoice</strong>
              <span className="block text-xs text-muted-foreground">
                Connect the payment to the invoice it pays — clears the balance.
              </span>
            </span>
          </li>
        </ol>
      </ContentCard>

      <div className="grid gap-4 sm:grid-cols-2">
        <ContentCard className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Invoices awaiting payment
          </div>
          <p className="text-2xl font-semibold tabular-nums">
            {isLoading ? '…' : formatMoneyGbp(totalDue)}
          </p>
          <p className="text-xs text-muted-foreground">
            {outstanding.length} invoice{outstanding.length === 1 ? '' : 's'} not fully paid
          </p>
        </ContentCard>
        <ContentCard className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            Payments to link
          </div>
          <p className="text-2xl font-semibold tabular-nums">
            {isLoading ? '…' : formatMoneyGbp(totalUnlinked)}
          </p>
          <p className="text-xs text-muted-foreground">
            {paymentsNeedingLink.length} payment{paymentsNeedingLink.length === 1 ? '' : 's'} not
            fully linked
          </p>
        </ContentCard>
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Invoices awaiting payment</h3>
          <p className="text-xs text-muted-foreground">
            Sent invoices with an outstanding balance. Record payment against each one.
          </p>
        </div>
        {outstandingQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading invoices…
          </div>
        ) : outstanding.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            All invoices are paid. When you send a new invoice run, it will appear here.
          </div>
        ) : (
          <div className="space-y-2">
            {outstanding.map(inv => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sm">{inv.period}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.outstanding} due · sent {inv.dueDate}
                  </p>
                </div>
                {canManage ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      openRecord({
                        invoiceRunId: inv.id,
                        amount: parseMoney(inv.outstanding),
                      })
                    }
                  >
                    Receive payment
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Money received</h3>
          <p className="text-xs text-muted-foreground">
            Payments logged in the system. Link any that still say &quot;Needs linking&quot;.
          </p>
        </div>
        {paymentsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading payments…
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No payments recorded yet. Click <strong>Record payment</strong> when money arrives.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Reference
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Invoice link
                  </th>
                  {canManage ? (
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                      Action
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {payments.map(row => {
                  const link = paymentLinkSummary(row)
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2.5 font-mono text-xs">{row.reference}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                        {row.amount}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{row.received}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={matchStatusVariant(row.matchStatus)} size="sm">
                          {link.label}
                        </Badge>
                        {link.detail ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{link.detail}</p>
                        ) : null}
                      </td>
                      {canManage ? (
                        <td className="px-3 py-2.5">
                          {needsLinking(row) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Link2 className="h-3.5 w-3.5" />}
                              onClick={() => setMatchPayment(row)}
                            >
                              Link
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Done</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RecordPaymentDialog
        open={createOpen}
        onOpenChange={open => {
          setCreateOpen(open)
          if (!open) setRecordPrefill(null)
        }}
        prefill={recordPrefill}
      />
      <MatchPaymentDialog
        open={matchPayment != null}
        onOpenChange={open => {
          if (!open) setMatchPayment(null)
        }}
        payment={matchPayment}
      />
    </div>
  )
}
