import * as React from 'react'
import { Link2, Loader2, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import type { PaymentRow } from '@/features/billing/api/payments.api'
import {
  useAddPaymentAllocation,
  useOutstandingInvoiceRuns,
  usePayment,
  useRemovePaymentAllocation,
} from '@/features/billing/hooks/usePayments'
import { matchStatusVariant, parseMoney, paymentLinkSummary } from '@/features/billing/utils/payment-display.util'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'

type MatchPaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: PaymentRow | null
}

export function MatchPaymentDialog({ open, onOpenChange, payment }: MatchPaymentDialogProps) {
  const { locationId } = useGlobalLocationScope()
  const paymentId = open && payment ? payment.id : undefined
  const detailQuery = usePayment(paymentId)
  const outstandingQuery = useOutstandingInvoiceRuns(open, locationId)
  const addMutation = useAddPaymentAllocation()
  const removeMutation = useRemovePaymentAllocation()

  const [invoiceRunId, setInvoiceRunId] = React.useState('')
  const [amount, setAmount] = React.useState('')

  const detail = detailQuery.data ?? payment
  const allocations = detailQuery.data?.allocations ?? []
  const allocatedInvoiceIds = new Set(allocations.map(a => a.invoiceRunId))
  const unmatchedAmount = parseMoney(detail?.unmatched ?? '0')
  const availableInvoices = (outstandingQuery.data ?? []).filter(
    inv => !allocatedInvoiceIds.has(inv.id),
  )
  const linkSummary = payment ? paymentLinkSummary(payment) : null

  React.useEffect(() => {
    if (open) {
      setInvoiceRunId('')
      setAmount('')
    }
  }, [open, payment?.id])

  const handleInvoiceSelect = (id: string) => {
    setInvoiceRunId(id)
    const invoice = availableInvoices.find(inv => inv.id === id)
    if (invoice) {
      const invoiceOutstanding = parseMoney(invoice.outstanding)
      setAmount(String(Math.min(unmatchedAmount, invoiceOutstanding).toFixed(2)))
    }
  }

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentId) return
    const amountNum = Number(amount)
    if (!invoiceRunId || amountNum <= 0) return

    try {
      await addMutation.mutateAsync({ paymentId, invoiceRunId, amount: amountNum })
      toastSuccess('Payment linked to invoice')
      setInvoiceRunId('')
      setAmount('')
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Failed to link payment'))
    }
  }

  const handleRemove = async (allocationId: string) => {
    if (!paymentId) return
    try {
      await removeMutation.mutateAsync({ paymentId, allocationId })
      toastSuccess('Link removed')
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Failed to remove link'))
    }
  }

  const isMutating = addMutation.isPending || removeMutation.isPending
  const canAddMore = unmatchedAmount > 0 && availableInvoices.length > 0

  if (!payment || !detail) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link payment to invoice</DialogTitle>
          <DialogDescription>
            Apply this received payment to a sent invoice. The invoice balance and aged debt update
            when linked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-medium">{payment.reference}</span>
              {linkSummary ? (
                <Badge variant={matchStatusVariant(payment.matchStatus)} size="sm">
                  {linkSummary.label}
                </Badge>
              ) : null}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 tabular-nums">
              <div>
                <dt className="text-xs text-muted-foreground">Received</dt>
                <dd className="font-medium">{payment.amount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Still to link</dt>
                <dd className="font-medium">{detail.unmatched}</dd>
              </div>
            </dl>
          </div>

          {detailQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : allocations.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Already linked to</p>
              <ul className="space-y-2">
                {allocations.map(row => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{row.period}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{row.amount}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isMutating}
                      onClick={() => void handleRemove(row.id)}
                      aria-label="Remove link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {unmatchedAmount > 0 ? (
            <form onSubmit={e => void handleAddLink(e)} className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Link to invoice</p>
              {outstandingQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading invoices…
                </div>
              ) : !canAddMore ? (
                <p className="text-sm text-muted-foreground">
                  {availableInvoices.length === 0
                    ? 'All invoices are paid. This payment stays on file as unlinked credit until a new invoice is sent.'
                    : 'Nothing left to link on this payment.'}
                </p>
              ) : (
                <>
                  <Select value={invoiceRunId || undefined} onValueChange={handleInvoiceSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose invoice…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableInvoices.map(inv => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.period} — {inv.outstanding} due
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid gap-2">
                    <label htmlFor="linkAmount" className="text-xs font-medium text-muted-foreground">
                      Amount to apply (£)
                    </label>
                    <Input
                      id="linkAmount"
                      type="number"
                      min={0.01}
                      max={unmatchedAmount}
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isMutating || !invoiceRunId || !amount}
                    leftIcon={<Link2 className="h-3.5 w-3.5" />}
                  >
                    {addMutation.isPending ? 'Linking…' : 'Link to invoice'}
                  </Button>
                </>
              )}
            </form>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
