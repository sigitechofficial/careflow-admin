import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import type {
  InvoiceRunServiceUserHistoryEvent,
  InvoiceRunServiceUserSummary,
} from '@/features/billing/api/invoice-runs.api'

function formatEventWhen(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(d)
}

function eventTone(type: InvoiceRunServiceUserHistoryEvent['type']): string {
  if (type === 'PAYMENT') return 'bg-emerald-500'
  if (type === 'SENT') return 'bg-sky-500'
  if (type === 'APPROVED' || type === 'LOCKED') return 'bg-amber-500'
  return 'bg-muted-foreground/50'
}

export function InvoiceServiceUserHistoryDialog({
  open,
  onOpenChange,
  group,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: InvoiceRunServiceUserSummary | null
}) {
  if (!group) return null
  const history = group.history ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invoice history</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
            <p className="font-medium text-foreground">{group.serviceUserName}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span>Invoiced {group.subtotal}</span>
              <span>Paid {group.paid ?? '£0.00'}</span>
              <span>Balance {group.outstanding ?? group.subtotal}</span>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No history events yet for this invoice.
            </p>
          ) : (
            <ol className="relative space-y-0 border-l border-border pl-4">
              {history.map((event, index) => (
                <li key={event.id} className="relative pb-5 last:pb-0">
                  <span
                    className={cn(
                      'absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-background',
                      eventTone(event.type),
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="text-sm font-medium text-foreground">{event.label}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatEventWhen(event.at)}
                      </p>
                    </div>
                    {event.amount ? (
                      <p
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          event.type === 'PAYMENT'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-foreground',
                        )}
                      >
                        {event.amount}
                      </p>
                    ) : null}
                    {event.reference ? (
                      <p className="text-xs text-muted-foreground">Ref {event.reference}</p>
                    ) : null}
                    {event.detail ? (
                      <p className="text-xs text-muted-foreground">{event.detail}</p>
                    ) : null}
                    {index === history.length - 1 &&
                    group.paymentStatus === 'PAID' &&
                    event.type === 'PAYMENT' ? (
                      <p className="pt-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Invoice fully paid
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
