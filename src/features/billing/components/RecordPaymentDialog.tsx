import * as React from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
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
import { useCreatePayment, useOutstandingInvoiceRuns } from '@/features/billing/hooks/usePayments'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import type { PaymentType } from '@/features/billing/types/billing.types'
import type { OutstandingInvoiceRun } from '@/features/billing/api/payments.api'
import { parseMoney } from '@/features/billing/utils/payment-display.util'

const PAYMENT_TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'COUNCIL_REMITTANCE', label: 'Council remittance' },
  { value: 'DIRECT_DEBIT', label: 'Direct Debit' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
]

export type RecordPaymentPrefill = {
  invoiceRunId?: string
  amount?: number
  reference?: string
}

type RecordPaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefill?: RecordPaymentPrefill | null
}

function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function defaultLinkAmount(
  paymentAmount: number,
  invoice: OutstandingInvoiceRun | undefined,
): number {
  if (!invoice) return paymentAmount
  return Math.min(paymentAmount, parseMoney(invoice.outstanding))
}

export function RecordPaymentDialog({ open, onOpenChange, prefill }: RecordPaymentDialogProps) {
  const { locationId } = useGlobalLocationScope()
  const createMutation = useCreatePayment()
  const outstandingQuery = useOutstandingInvoiceRuns(open, locationId)

  const [reference, setReference] = React.useState('')
  const [paymentType, setPaymentType] = React.useState<PaymentType>('BANK_TRANSFER')
  const [amount, setAmount] = React.useState('')
  const [receivedDate, setReceivedDate] = React.useState(todayIso())
  const [invoiceRunId, setInvoiceRunId] = React.useState('')
  const [linkAmount, setLinkAmount] = React.useState('')
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [notes, setNotes] = React.useState('')

  const outstanding = outstandingQuery.data ?? []
  const amountNum = Number(amount) || 0
  const selectedInvoice = outstanding.find(inv => inv.id === invoiceRunId)
  const linkNow = Boolean(invoiceRunId && invoiceRunId !== '__none__')

  React.useEffect(() => {
    if (!open) return
    const prefillAmount = prefill?.amount != null ? String(prefill.amount) : ''
    setReference(prefill?.reference ?? '')
    setPaymentType('BANK_TRANSFER')
    setAmount(prefillAmount)
    setReceivedDate(todayIso())
    setInvoiceRunId(prefill?.invoiceRunId ?? '')
    setLinkAmount('')
    setNotes('')
    setShowAdvanced(false)
  }, [open, prefill?.invoiceRunId, prefill?.amount, prefill?.reference])

  React.useEffect(() => {
    if (!open || !prefill?.invoiceRunId) return
    const inv = outstanding.find(i => i.id === prefill.invoiceRunId)
    if (!inv) return
    const num = Number(amount) || prefill.amount || 0
    if (num > 0) {
      setLinkAmount(String(defaultLinkAmount(num, inv).toFixed(2)))
    }
  }, [open, prefill?.invoiceRunId, prefill?.amount, outstanding, amount])

  const handleAmountChange = (value: string) => {
    setAmount(value)
    const num = Number(value) || 0
    if (linkNow && selectedInvoice) {
      setLinkAmount(String(defaultLinkAmount(num, selectedInvoice).toFixed(2)))
    }
  }

  const handleInvoiceChange = (id: string) => {
    setInvoiceRunId(id)
    if (id === '__none__') {
      setLinkAmount('')
      return
    }
    const invoice = outstanding.find(inv => inv.id === id)
    if (invoice && amountNum > 0) {
      setLinkAmount(String(defaultLinkAmount(amountNum, invoice).toFixed(2)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const allocations =
        linkNow && invoiceRunId && Number(linkAmount) > 0
          ? [{ invoiceRunId, amount: Number(linkAmount), notes: notes.trim() || undefined }]
          : undefined

      await createMutation.mutateAsync({
        reference: reference.trim(),
        paymentType,
        amount: amountNum,
        receivedDate,
        notes: notes.trim() || undefined,
        allocations,
      })
      toastSuccess(linkNow ? 'Payment recorded and linked to invoice' : 'Payment recorded')
      onOpenChange(false)
    } catch (err) {
      toastApiError(err instanceof ApiError ? err : new Error('Failed to record payment'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={e => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>Record payment received</DialogTitle>
            <DialogDescription>
              Step 1: enter what arrived in the bank. Step 2: choose which invoice it pays (recommended).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Tip:</span> linking now clears aged debt
              immediately. You can also link later from the payments list.
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                1 · Payment received
              </p>
              <div className="grid gap-2">
                <label htmlFor="paymentReference" className="text-sm font-medium">
                  Bank / remittance reference
                </label>
                <Input
                  id="paymentReference"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="e.g. REM-LCC-2026-W27"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label htmlFor="paymentAmount" className="text-sm font-medium">
                    Amount (£)
                  </label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={amount}
                    onChange={e => handleAmountChange(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="paymentReceived" className="text-sm font-medium">
                    Date received
                  </label>
                  <Input
                    id="paymentReceived"
                    type="date"
                    value={receivedDate}
                    onChange={e => setReceivedDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                2 · Link to invoice
              </p>
              {outstandingQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading invoices…
                </div>
              ) : outstanding.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No invoices awaiting payment. Lock and send an invoice run first, or save the
                  payment and link it later.
                </p>
              ) : (
                <>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Which invoice is this paying?</label>
                    <Select
                      value={invoiceRunId || '__none__'}
                      onValueChange={handleInvoiceChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an invoice…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Link later</SelectItem>
                        {outstanding.map(inv => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.period} — {inv.outstanding} due
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {linkNow ? (
                    <div className="grid gap-2">
                      <label htmlFor="linkAmount" className="text-sm font-medium">
                        Amount to apply to this invoice (£)
                      </label>
                      <Input
                        id="linkAmount"
                        type="number"
                        min={0.01}
                        max={amountNum || undefined}
                        step="0.01"
                        value={linkAmount}
                        onChange={e => setLinkAmount(e.target.value)}
                        required
                      />
                      {selectedInvoice ? (
                        <p className="text-xs text-muted-foreground">
                          Invoice balance: {selectedInvoice.outstanding}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowAdvanced(v => !v)}
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              />
              More options
            </button>
            {showAdvanced ? (
              <div className="grid gap-3 rounded-lg border border-dashed border-border p-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Payment type</label>
                  <Select value={paymentType} onValueChange={v => setPaymentType(v as PaymentType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="paymentNotes" className="text-sm font-medium">
                    Notes
                  </label>
                  <Input
                    id="paymentNotes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : linkNow ? 'Save & link' : 'Save payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
