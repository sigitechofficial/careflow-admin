import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'

const LIFECYCLE_CLASS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-border',
  SCHEDULED: 'bg-muted text-muted-foreground border-border',
  UNASSIGNED: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200',
  ASSIGNED: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  EN_ROUTE: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  DUE: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200',
  CHECKED_IN: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30 dark:text-emerald-200',
  IN_PROGRESS: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30 dark:text-emerald-200',
  CHECKED_OUT: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30 dark:text-emerald-200',
  COMPLETED: 'bg-success/10 text-success border-success/20',
  COMPLETED_WITH_EXCEPTION: 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200',
  CLOSED: 'bg-muted text-muted-foreground border-border',
}

const ARRIVAL_CLASS: Record<string, string> = {
  EARLY_ARRIVAL: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  ON_TIME: 'bg-success/10 text-success border-success/20',
  LATE_ARRIVAL: 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200',
  VERY_LATE_ARRIVAL: 'bg-destructive/10 text-destructive border-destructive/30',
  NOT_ASSESSED: 'bg-muted text-muted-foreground border-border',
}

const MISSED_CLASS: Record<string, string> = {
  NONE: 'bg-muted text-muted-foreground border-border',
  POTENTIAL_MISSED: 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200',
  ATTENDANCE_VERIFICATION_PENDING:
    'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200',
  CONFIRMED_MISSED: 'bg-destructive/10 text-destructive border-destructive/30',
  FALSE_ECM_ALERT: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  DISPUTED: 'bg-purple-500/10 text-purple-800 border-purple-500/30 dark:text-purple-200',
}

const CONFIDENCE_CLASS: Record<string, string> = {
  VERIFIED: 'bg-success/10 text-success border-success/20',
  PARTIALLY_VERIFIED: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200',
  MANUALLY_VERIFIED: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  UNVERIFIED: 'bg-muted text-muted-foreground border-border',
  DISPUTED: 'bg-purple-500/10 text-purple-800 border-purple-500/30 dark:text-purple-200',
  REJECTED: 'bg-destructive/10 text-destructive border-destructive/30',
}

const EXCEPTION_LIFECYCLE_CLASS: Record<string, string> = {
  DETECTED: 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200',
  ALERT_GENERATED: 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200',
  ASSIGNED: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  ACKNOWLEDGED: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  INVESTIGATING: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200',
  ACTION_TAKEN: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200',
  RESOLVED: 'bg-success/10 text-success border-success/20',
  MANAGER_REVIEWED: 'bg-success/10 text-success border-success/20',
  CLOSED: 'bg-muted text-muted-foreground border-border',
}

function humanize(code: string): string {
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

type Kind =
  | 'lifecycle'
  | 'arrival'
  | 'missed'
  | 'confidence'
  | 'duration'
  | 'exceptionLifecycle'
  | 'generic'

export function EcmStatusBadge({
  code,
  kind = 'generic',
  className,
}: {
  code: string | null | undefined
  kind?: Kind
  className?: string
}) {
  if (!code || code === 'NONE' || code === 'NOT_ASSESSED') {
    if (kind === 'missed' && code === 'NONE') return null
    if (code === 'NOT_ASSESSED') {
      return (
        <Badge variant="outline" className={cn('font-normal', className)}>
          Not assessed
        </Badge>
      )
    }
  }
  if (!code) return null

  const map =
    kind === 'lifecycle'
      ? LIFECYCLE_CLASS
      : kind === 'exceptionLifecycle'
        ? EXCEPTION_LIFECYCLE_CLASS
        : kind === 'arrival'
          ? ARRIVAL_CLASS
          : kind === 'missed'
            ? MISSED_CLASS
            : kind === 'confidence'
              ? CONFIDENCE_CLASS
              : ARRIVAL_CLASS

  return (
    <Badge variant="outline" className={cn('font-normal', map[code] ?? 'border-border', className)}>
      {humanize(code)}
    </Badge>
  )
}
