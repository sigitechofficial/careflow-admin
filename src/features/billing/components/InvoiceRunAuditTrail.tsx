import { cn } from '@/shared/lib/utils'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import type {
  InvoiceRunAuditAction,
  InvoiceRunAuditTrailItem,
} from '@/features/billing/api/invoice-runs.api'

function actionLabel(action: InvoiceRunAuditAction): string {
  switch (action) {
    case 'CREATED':
      return 'Created'
    case 'CALCULATED':
      return 'Calculated'
    case 'APPROVED':
      return 'Approved'
    case 'LOCKED':
      return 'Locked'
    case 'SENT':
      return 'Marked sent'
    case 'EMAIL_SENT':
      return 'Emailed'
    case 'EXPORTED':
      return 'Exported'
    case 'PAYMENT_ALLOCATED':
      return 'Payment allocated'
    default:
      return action
  }
}

function actionTone(action: InvoiceRunAuditAction): string {
  if (action === 'PAYMENT_ALLOCATED') return 'bg-emerald-500'
  if (action === 'EMAIL_SENT' || action === 'SENT') return 'bg-sky-500'
  if (action === 'APPROVED' || action === 'LOCKED') return 'bg-amber-500'
  if (action === 'CALCULATED' || action === 'EXPORTED') return 'bg-violet-500'
  return 'bg-muted-foreground/50'
}

export function InvoiceRunAuditTrail({
  events,
  className,
}: {
  events: InvoiceRunAuditTrailItem[]
  className?: string
}) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()

  const formatWhen = (value: string) => {
    const day = dayKeyFromInstant(value)
    return day ? `${formatDate(day)} ${formatTime(value)}` : '—'
  }

  if (events.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        No audit events recorded for this invoice run yet.
      </p>
    )
  }

  return (
    <ol
      className={cn('relative space-y-0 border-l border-border pl-4', className)}
      data-testid="billing-invoice-run-audit-trail"
    >
      {events.map(event => (
        <li key={event.id} className="relative pb-4 last:pb-0">
          <span
            className={cn(
              'absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-background',
              actionTone(event.action),
            )}
            aria-hidden
          />
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {actionLabel(event.action)}
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {formatWhen(event.at)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {event.actorName?.trim() || 'Unknown user'}
            </p>
            {event.detail ? (
              <p className="text-xs text-muted-foreground">{event.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
