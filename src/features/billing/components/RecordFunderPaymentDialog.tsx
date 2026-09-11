import * as React from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useCreatePayment } from '@/features/billing/hooks/usePayments'
import type { PaymentType } from '@/features/billing/types/billing.types'
import type {
  ServiceUserInvoiceFunderShare,
  ServiceUserInvoiceMonthRow,
} from '@/features/billing/types/service-user-invoices.types'

const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'COUNCIL_REMITTANCE', label: 'Council remittance' },
  { value: 'DIRECT_DEBIT', label: 'Direct debit' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
]

/** Sentinel select value meaning "not tied to a specific funder". */
const WHOLE_INVOICE = '__all__'
/** Key used for a funder line with no funder id (direct / family payer). */
const DIRECT_KEY = '__direct__'

const funderKey = (f: ServiceUserInvoiceFunderShare) => f.funderId ?? DIRECT_KEY

function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const selectClass =
  'h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

function FunderStatusDot({ status }: { status: ServiceUserInvoiceFunderShare['paymentStatus'] }) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        status === 'PAID' && 'bg-emerald-500',
        status === 'PART_PAID' && 'bg-amber-500',
        status === 'UNPAID' && 'bg-muted-foreground/40',
      )}
      aria-hidden
    />
  )
}

export function RecordFunderPaymentDialog({
  open,
  onOpenChange,
  invoice,
  serviceUserName,
  serviceUserId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: ServiceUserInvoiceMonthRow | null
  serviceUserName?: string
  serviceUserId?: string
}) {
  const create = useCreatePayment()
  const funders = invoice?.funders ?? []
  const hasFunderSplit = funders.length > 0

  const [funderSel, setFunderSel] = React.useState<string>(WHOLE_INVOICE)
  const [amount, setAmount] = React.useState('')
  const [reference, setReference] = React.useState('')
  const [paymentType, setPaymentType] = React.useState<PaymentType>('BANK_TRANSFER')
  const [receivedDate, setReceivedDate] = React.useState(todayIso())

  const selectedFunder = React.useMemo(
    () => funders.find((f) => funderKey(f) === funderSel) ?? null,
    [funders, funderSel],
  )

  // On open, default to the first funder that still owes money (so the common case is one click).
  React.useEffect(() => {
    if (!open || !invoice) return
    const firstOwing = (invoice.funders ?? []).find((f) => f.outstandingValue > 0.001)
    const initial = firstOwing ?? invoice.funders?.[0] ?? null
    const initialKey = initial ? funderKey(initial) : WHOLE_INVOICE
    setFunderSel(initialKey)
    setAmount(String(initial ? initial.outstandingValue : invoice.outstandingValue))
    setReference(
      initial && initial.funderId
        ? `${initial.funderName} — ${invoice.period}`
        : `Funder payment — ${invoice.period}`,
    )
    setPaymentType('BANK_TRANSFER')
    setReceivedDate(todayIso())
  }, [open, invoice])

  const handleFunderChange = (key: string) => {
    setFunderSel(key)
    const f = funders.find((x) => funderKey(x) === key) ?? null
    if (f) {
      setAmount(String(f.outstandingValue))
      if (f.funderId) setReference(`${f.funderName} — ${invoice?.period ?? ''}`.trim())
    } else if (invoice) {
      setAmount(String(invoice.outstandingValue))
    }
  }

  if (!invoice) return null

  const amt = Number(amount)
  // When a funder is selected, never accept more than that funder's outstanding;
  // always also respect the invoice/run outstanding passed on the row.
  const funderCap = selectedFunder?.outstandingValue
  const maxAmount =
    funderCap != null
      ? Math.min(invoice.outstandingValue, funderCap)
      : invoice.outstandingValue
  const amountValid = Number.isFinite(amt) && amt > 0 && amt <= maxAmount + 0.001
  const canSubmit = Boolean(reference.trim()) && amountValid
  const lockToSingleFunder = funders.length === 1 && Boolean(funders[0]?.funderId)

  async function submit() {
    if (!invoice || !canSubmit) return
    const rounded = Math.round(amt * 100) / 100
    // Prefer the selected funder; when opened from a single authority invoice, always tag it.
    const funderId =
      selectedFunder?.funderId ??
      (lockToSingleFunder ? funders[0]?.funderId : undefined) ??
      undefined
    const taggedServiceUserId = serviceUserId ?? invoice.serviceUserId
    try {
      await create.mutateAsync({
        reference: reference.trim(),
        paymentType,
        amount: rounded,
        receivedDate,
        recordStatus: 'RECEIVED',
        ...(funderId ? { funderId } : {}),
        ...(taggedServiceUserId ? { serviceUserId: taggedServiceUserId } : {}),
        allocations: [{ invoiceRunId: invoice.runId, amount: rounded }],
      })
      const who =
        selectedFunder && selectedFunder.funderId
          ? selectedFunder.funderName
          : funderId
            ? funders[0]?.funderName ?? 'Funder payment'
            : 'Funder payment'
      toastSuccess('Payment recorded', `${invoice.period} — ${who} applied.`)
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not record payment')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record funder payment</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
            <p className="font-medium text-foreground">
              {invoice.period}
              {serviceUserName ? <span className="text-muted-foreground"> · {serviceUserName}</span> : null}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span>Invoice total: {invoice.runNetTotal}</span>
              <span>Already paid: {invoice.paid}</span>
              <span className="font-medium text-foreground">Outstanding: {invoice.outstanding}</span>
            </div>
          </div>

          {hasFunderSplit ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Funder split
              </p>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                      <th className="px-2.5 py-1.5 text-left font-medium">Funder</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">Invoiced</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">Paid</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funders.map((f) => {
                      const key = funderKey(f)
                      const active = key === funderSel
                      return (
                        <tr
                          key={key}
                          className={cn(
                            'cursor-pointer border-b border-border last:border-0 hover:bg-muted/30',
                            active && 'bg-primary/5',
                          )}
                          onClick={() => handleFunderChange(key)}
                        >
                          <td className="px-2.5 py-1.5">
                            <span className="flex items-center gap-1.5">
                              <FunderStatusDot status={f.paymentStatus} />
                              <span className={cn(active && 'font-medium text-foreground')}>
                                {f.funderName}
                              </span>
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 text-right tabular-nums">{f.invoiced}</td>
                          <td className="px-2.5 py-1.5 text-right tabular-nums text-muted-foreground">
                            {f.paid}
                          </td>
                          <td
                            className={cn(
                              'px-2.5 py-1.5 text-right tabular-nums',
                              f.outstandingValue > 0.001 ? 'font-medium text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {f.outstanding}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="pay-funder">Paid by</Label>
            <select
              id="pay-funder"
              className={selectClass}
              value={funderSel}
              onChange={(e) => handleFunderChange(e.target.value)}
              disabled={lockToSingleFunder}
            >
              {funders.map((f) => (
                <option key={funderKey(f)} value={funderKey(f)}>
                  {f.funderName}
                  {f.outstandingValue > 0.001 ? ` — ${f.outstanding} due` : ' — settled'}
                </option>
              ))}
              {!lockToSingleFunder ? (
                <option value={WHOLE_INVOICE}>Whole invoice (no specific funder)</option>
              ) : null}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pay-amount">Amount received (£)</Label>
              <Input
                id="pay-amount"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {!amountValid && amount.trim() ? (
                <p className="text-xs text-destructive">
                  Enter an amount up to £{maxAmount.toFixed(2)} outstanding.
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-date">Received date</Label>
              <Input
                id="pay-date"
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pay-method">Payment method</Label>
            <select
              id="pay-method"
              className={selectClass}
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PaymentType)}
            >
              {PAYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pay-ref">Reference</Label>
            <Input
              id="pay-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Remittance / bank reference"
            />
          </div>

          {selectedFunder && selectedFunder.outstandingValue > 0.001 ? (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setAmount(String(Math.min(selectedFunder.outstandingValue, maxAmount)))}
            >
              {selectedFunder.funderName} paid in full ({selectedFunder.outstanding})
            </button>
          ) : (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setAmount(String(maxAmount))}
            >
              Paid in full ({invoice.outstanding})
            </button>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={!canSubmit}>
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
