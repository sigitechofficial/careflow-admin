import { Link } from '@tanstack/react-router'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/misc'
import { cn } from '@/shared/lib/utils'
import type { MedicalSafetyItem, SafetySeverity } from '@/features/alerts/medical-safety/types'
import { useServiceUserMedicalSafety } from '@/features/alerts/hooks/useServiceUserMedicalSafety'

const SEVERITY_BADGE: Record<
  SafetySeverity,
  'destructive' | 'warning' | 'secondary' | 'outline' | 'default'
> = {
  CRITICAL: 'destructive',
  HIGH: 'warning',
  MEDIUM: 'secondary',
  LOW: 'outline',
  INFO: 'outline',
}

function SafetyItemLink({ item }: { item: MedicalSafetyItem }) {
  if (!item.link) return null
  return (
    <Link
      to={item.link.to}
      params={item.link.params}
      search={item.link.search}
      className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-200"
    >
      {item.link.label}
    </Link>
  )
}

export function SafetySeverityBadge({ severity }: { severity: SafetySeverity }) {
  return (
    <Badge variant={SEVERITY_BADGE[severity]} size="sm" aria-label={`Severity ${severity}`}>
      {severity}
    </Badge>
  )
}

export function MedicalSafetyItemRow({
  item,
  emphasize,
}: {
  item: MedicalSafetyItem
  emphasize?: boolean
}) {
  return (
    <li
      className={cn(
        'flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2.5',
        emphasize
          ? 'border-amber-300/80 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
          : 'border-border/70 bg-card',
        'border-l-[3px] border-l-teal-600 dark:border-l-teal-400',
      )}
      data-testid={`medical-safety-item-${item.id}`}
      data-kind={item.kind}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <SafetySeverityBadge severity={item.severity} />
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Medical / safety
          </span>
          <span className="text-xs text-muted-foreground">{item.sourceLabel}</span>
        </div>
        <p className="text-sm font-medium">{item.title}</p>
        {item.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        ) : null}
      </div>
      <SafetyItemLink item={item} />
    </li>
  )
}

type SummaryProps = {
  serviceUserId: string
  className?: string
  /** Compact card for host pages */
  compact?: boolean
  enabled?: boolean
  /** When Overview already shows the flash banner, omit the full flash from Immediate. */
  omitFlashFromImmediate?: boolean
}

/**
 * Presentation-only safety summary. Does not create Alert records.
 */
export function ServiceUserSafetySummary({
  serviceUserId,
  className,
  compact = true,
  enabled = true,
  omitFlashFromImmediate = false,
}: SummaryProps) {
  const { snapshot, medicalLoading, medicalError, refetchMedical, permissions } =
    useServiceUserMedicalSafety(serviceUserId, {
      enabled,
      omitFlashFromImmediate,
    })

  if (!permissions.canProfile && !permissions.canAllergies && !permissions.canMedAllergies) {
    return null
  }

  const preview = snapshot.immediate.slice(0, compact ? 3 : 5)
  const count = snapshot.immediate.length
  const flashOmitted = omitFlashFromImmediate

  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-card p-4 shadow-sm',
        className,
      )}
      data-testid="service-user-safety-summary"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-semibold">Safety information</h2>
          {count > 0 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {count} important
            </span>
          ) : null}
        </div>
        <Link
          to="/service-users/$serviceUserId/alerts"
          params={{ serviceUserId }}
          className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-200"
        >
          View medical & alerts
        </Link>
      </div>

      {flashOmitted ? (
        <p className="mb-2 text-xs text-muted-foreground" data-testid="safety-summary-flash-note">
          Urgent flash message is shown in the banner above.
        </p>
      ) : null}

      {medicalLoading ? (
        <div className="space-y-2" data-testid="safety-summary-loading">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : medicalError ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-destructive">Unable to load safety information</p>
          <Button type="button" size="sm" variant="outline" onClick={() => refetchMedical()}>
            Retry
          </Button>
        </div>
      ) : preview.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {flashOmitted
            ? 'No other critical safety items recorded.'
            : 'No critical safety items recorded.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {preview.map((item) => (
            <li key={item.id} className="flex gap-2 text-sm">
              <AlertTriangle
                className={cn(
                  'mt-0.5 h-3.5 w-3.5 shrink-0',
                  item.severity === 'CRITICAL' || item.severity === 'HIGH'
                    ? 'text-destructive'
                    : 'text-muted-foreground',
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="font-medium leading-snug">
                  <span className="sr-only">{item.severity}. </span>
                  {item.title}
                </p>
                {item.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                ) : null}
              </div>
            </li>
          ))}
          {count > preview.length ? (
            <li className="text-xs text-muted-foreground">
              +{count - preview.length} more — view medical & alerts
            </li>
          ) : null}
        </ul>
      )}
    </section>
  )
}
