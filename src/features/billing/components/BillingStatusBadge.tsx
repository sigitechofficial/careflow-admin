import { Link } from '@tanstack/react-router'
import { Badge, type BadgeProps } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import type {
  ExportStatus,
  InvoiceRunStatus,
  PayrollRunStatus,
  RateCardStatus,
  VisitReconciliationStatus,
} from '@/features/billing/types/billing.types'
import {
  resolveFinanceExceptionFix,
  type FinanceExceptionFixTarget,
} from '@/features/billing/utils/finance-exception-fix.util'

/** Human-readable label from enum/code or sentence-case text. */
export function formatBillingLabel(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed

  if (trimmed.includes(' ') && trimmed !== trimmed.toUpperCase()) {
    return trimmed
  }

  return trimmed
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

const STATUS_VARIANTS: Record<string, BadgeProps['variant']> = {
  ACTIVE: 'success',
  APPROVED: 'success',
  APPROVED_FOR_BOTH: 'success',
  APPROVED_FOR_PAY: 'success',
  APPROVED_FOR_INVOICE: 'success',
  LOCKED: 'success',
  SENT: 'success',
  PAID: 'success',
  PART_PAID: 'warning',
  UNPAID: 'muted',
  EXPORTED: 'success',
  COMPLETED: 'success',
  RENDERED: 'success',
  ACCEPTED_BY_FUNDER: 'success',

  SETUP_INCOMPLETE: 'destructive',
  READY: 'success',
  ENDED: 'muted',

  DRAFT: 'warning',
  PENDING_REVIEW: 'warning',
  PENDING_APPROVAL: 'warning',
  READY_FOR_REVIEW: 'warning',
  REQUIRES_MANAGER_APPROVAL: 'warning',
  CALCULATING: 'warning',
  QUEUED: 'warning',
  SCHEDULED: 'info',
  READY_TO_RENDER: 'info',

  EXCEPTION_FOUND: 'destructive',
  TEMPLATE_VALIDATION_FAILED: 'destructive',
  TEMPLATE_MISSING: 'destructive',
  TEMPLATE_MAPPING_INCOMPLETE: 'destructive',
  FAILED: 'destructive',
  REJECTED: 'destructive',
  REJECTED_BY_FUNDER: 'destructive',
  DISPUTED: 'destructive',
  UPLOAD_FAILED: 'destructive',
  REQUIRES_CORRECTION: 'destructive',

  OVERRUN: 'warning',
  GPS_MISMATCH: 'warning',
  LATE_ARRIVAL: 'warning',
  EARLY_FINISH: 'warning',

  EXPIRED: 'muted',
  ARCHIVED: 'muted',
  SUSPENDED: 'muted',
  REPLACED: 'muted',
  CANCELLED: 'muted',
}

function variantForStatus(status: string): BadgeProps['variant'] {
  const key = status.trim().toUpperCase().replace(/\s+/g, '_')
  if (STATUS_VARIANTS[key]) return STATUS_VARIANTS[key]

  const s = key
  if (
    s.includes('ACTIVE') ||
    s.includes('APPROVED') ||
    s.includes('PAID') ||
    s.includes('SENT') ||
    s.includes('EXPORTED') ||
    s.includes('LOCKED') ||
    s.includes('COMPLETED') ||
    s.includes('MATCHED')
  ) {
    return 'success'
  }
  if (
    s.includes('DRAFT') ||
    s.includes('PENDING') ||
    s.includes('CALCULATING') ||
    s.includes('QUEUED') ||
    s.includes('REVIEW') ||
    s.includes('REQUIRES')
  ) {
    return 'warning'
  }
  if (
    s.includes('EXCEPTION') ||
    s.includes('FAILED') ||
    s.includes('MISSING') ||
    s.includes('REJECTED') ||
    s.includes('DISPUTED') ||
    s.includes('INCOMPLETE')
  ) {
    return 'destructive'
  }
  if (s.includes('EXPIRED') || s.includes('ARCHIVED')) {
    return 'muted'
  }
  return 'secondary'
}

type BillingBadgeProps = {
  status: string
  className?: string
  size?: BadgeProps['size']
}

export function BillingStatusBadge({ status, className, size = 'md' }: BillingBadgeProps) {
  return (
    <Badge
      variant={variantForStatus(status)}
      size={size}
      className={cn('whitespace-nowrap font-medium normal-case', className)}
    >
      {formatBillingLabel(status)}
    </Badge>
  )
}

export function BillingExceptionBadge({
  code,
  className,
  message,
  serviceUserId,
  employeeId,
  scheduledJobId,
  fixTarget,
}: {
  code: string
  className?: string
  /** Optional exception message — improves RATE_MISSING routing and hover detail. */
  message?: string | null
  serviceUserId?: string | null
  employeeId?: string | null
  scheduledJobId?: string | null
  /** Pre-resolved target; wins over code/context resolution. */
  fixTarget?: FinanceExceptionFixTarget | null
}) {
  const resolved =
    fixTarget === undefined
      ? resolveFinanceExceptionFix({
          code,
          message,
          serviceUserId,
          employeeId,
          scheduledJobId,
        })
      : fixTarget

  const label = formatBillingLabel(code)
  const detail = message?.trim() || null

  const badge = (
    <Badge
      variant={variantForStatus(code)}
      size="md"
      className={cn(
        'whitespace-nowrap font-medium normal-case',
        resolved ? 'cursor-pointer hover:underline underline-offset-2' : null,
        className,
      )}
    >
      {label}
    </Badge>
  )

  const trigger = resolved ? (
    <Link
      to={resolved.to}
      params={resolved.params}
      search={resolved.search}
      className="inline-flex"
      onClick={e => e.stopPropagation()}
    >
      {badge}
    </Link>
  ) : (
    <span className="inline-flex">{badge}</span>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="z-[110] max-w-sm text-left text-xs leading-snug"
          data-testid="billing-exception-tooltip"
        >
          <p className="font-medium text-popover-foreground">{label}</p>
          {detail && detail !== code && detail !== label ? (
            <p className="mt-1 text-popover-foreground/90">{detail}</p>
          ) : (
            <p className="mt-1 text-popover-foreground/80">Code: {code}</p>
          )}
          {resolved ? (
            <p className="mt-1.5 text-popover-foreground/70">Click to open: {resolved.label}</p>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function RateCardStatusBadge({ status }: { status: RateCardStatus }) {
  return <BillingStatusBadge status={status} />
}

export function PayrollRunStatusBadge({ status }: { status: PayrollRunStatus }) {
  return <BillingStatusBadge status={status} />
}

export function InvoiceRunStatusBadge({ status }: { status: InvoiceRunStatus }) {
  return <BillingStatusBadge status={status} />
}

export function VisitReconStatusBadge({ status }: { status: VisitReconciliationStatus }) {
  return <BillingStatusBadge status={status} />
}

export function ExportStatusBadge({ status }: { status: ExportStatus }) {
  return <BillingStatusBadge status={status} />
}
