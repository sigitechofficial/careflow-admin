import type { LucideIcon } from 'lucide-react'
import {
  AlarmClock,
  BadgeCheck,
  Ban,
  BellOff,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  Clock,
  Crosshair,
  DoorOpen,
  Eye,
  Hand,
  Hourglass,
  LocateOff,
  Lock,
  LogIn,
  LogOut,
  MapPinOff,
  Megaphone,
  Navigation,
  Radar,
  Scale,
  ScanSearch,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  Siren,
  ThumbsUp,
  Timer,
  Undo2,
  UserPlus,
  UserX,
  XCircle,
} from 'lucide-react'
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
  LEFT_VISIT_AREA: 'bg-destructive/10 text-destructive border-destructive/30',
  MOCK_LOCATION: 'bg-violet-500/10 text-violet-800 border-violet-500/30 dark:text-violet-200',
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
  ALERT_GENERATED: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200',
  ASSIGNED: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  ACKNOWLEDGED: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  INVESTIGATING: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200',
  ACTION_TAKEN: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200',
  RESOLVED: 'bg-success/10 text-success border-success/20',
  MANAGER_REVIEWED: 'bg-success/10 text-success border-success/20',
  CLOSED: 'bg-muted text-muted-foreground border-border',
}

const GENERIC_CHIP_CLASS: Record<string, string> = {
  OVERDUE: 'bg-red-500/10 text-red-800 border-red-500/30 dark:text-red-200',
  MISSING_CHECKOUT: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  OUTSIDE_GEOFENCE: 'bg-destructive/10 text-destructive border-destructive/30',
  MANUAL_ATTENDANCE: 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
  LOW_GPS_ACCURACY: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200',
  SHORT_VISIT: 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200',
  LONG_VISIT: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-200',
  EXCESSIVE_OVERRUN: 'bg-destructive/10 text-destructive border-destructive/30',
  EARLY_DEPARTURE: 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200',
  LATE_DEPARTURE: 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200',
  ALLOWED: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30 dark:text-emerald-200',
  LOCKED: 'bg-destructive/10 text-destructive border-destructive/30',
}

const ICON_BY_CODE: Record<string, LucideIcon> = {
  MOCK_LOCATION: Radar,
  LEFT_VISIT_AREA: MapPinOff,
  OUTSIDE_GEOFENCE: LocateOff,
  MANUAL_ATTENDANCE: Hand,
  LOW_GPS_ACCURACY: Crosshair,
  OVERDUE: AlarmClock,
  LATE_ARRIVAL: Clock,
  VERY_LATE_ARRIVAL: AlarmClock,
  EARLY_ARRIVAL: Clock,
  EARLY_DEPARTURE: LogOut,
  LATE_DEPARTURE: Clock,
  SHORT_VISIT: Timer,
  LONG_VISIT: Hourglass,
  EXCESSIVE_OVERRUN: Hourglass,
  POTENTIAL_MISSED: CircleHelp,
  CONFIRMED_MISSED: XCircle,
  MISSING_CHECKOUT: DoorOpen,
  ON_TIME: CheckCircle2,
  DETECTED: ScanSearch,
  ALERT_GENERATED: Siren,
  ACKNOWLEDGED: Eye,
  INVESTIGATING: Search,
  ACTION_TAKEN: CheckCircle2,
  RESOLVED: CheckCircle2,
  MANAGER_REVIEWED: BadgeCheck,
  DRAFT: CalendarClock,
  SCHEDULED: CalendarClock,
  UNASSIGNED: UserX,
  ASSIGNED: UserPlus,
  EN_ROUTE: Navigation,
  DUE: AlarmClock,
  CHECKED_IN: LogIn,
  IN_PROGRESS: Timer,
  CHECKED_OUT: LogOut,
  COMPLETED: CheckCircle2,
  COMPLETED_WITH_EXCEPTION: CircleAlert,
  CLOSED: Ban,
  VERIFIED: ShieldCheck,
  PARTIALLY_VERIFIED: Shield,
  MANUALLY_VERIFIED: Hand,
  UNVERIFIED: ShieldQuestion,
  DISPUTED: Scale,
  REJECTED: ShieldX,
  ATTENDANCE_VERIFICATION_PENDING: ShieldAlert,
  FALSE_ECM_ALERT: BellOff,
  LATE_NOTICE: Clock,
  RETROSPECTIVE: Undo2,
  APPROVAL_PENDING: Clock,
  SU_INFORMED: Megaphone,
  SU_AGREED: ThumbsUp,
  MANAGER_APPROVED: BadgeCheck,
  ALLOWED: CheckCircle2,
  LOCKED: Lock,
  OTHER: CircleAlert,
}

const ICON_TONE = {
  danger: 'text-red-500 dark:text-red-400',
  warning: 'text-orange-500 dark:text-orange-400',
  caution: 'text-amber-500 dark:text-amber-400',
  info: 'text-sky-500 dark:text-sky-400',
  success: 'text-emerald-500 dark:text-emerald-400',
  purple: 'text-violet-500 dark:text-violet-400',
  muted: 'text-muted-foreground',
} as const

const ICON_COLOR_BY_CODE: Record<string, string> = {
  MOCK_LOCATION: ICON_TONE.purple,
  LEFT_VISIT_AREA: ICON_TONE.danger,
  OUTSIDE_GEOFENCE: ICON_TONE.danger,
  MANUAL_ATTENDANCE: ICON_TONE.info,
  LOW_GPS_ACCURACY: ICON_TONE.caution,
  OVERDUE: ICON_TONE.danger,
  LATE_ARRIVAL: ICON_TONE.warning,
  VERY_LATE_ARRIVAL: ICON_TONE.danger,
  EARLY_ARRIVAL: ICON_TONE.info,
  EARLY_DEPARTURE: ICON_TONE.warning,
  LATE_DEPARTURE: ICON_TONE.warning,
  SHORT_VISIT: ICON_TONE.warning,
  LONG_VISIT: ICON_TONE.caution,
  EXCESSIVE_OVERRUN: ICON_TONE.danger,
  POTENTIAL_MISSED: ICON_TONE.warning,
  CONFIRMED_MISSED: ICON_TONE.danger,
  MISSING_CHECKOUT: ICON_TONE.info,
  ON_TIME: ICON_TONE.success,
  DETECTED: ICON_TONE.warning,
  ALERT_GENERATED: ICON_TONE.caution,
  ACKNOWLEDGED: ICON_TONE.info,
  INVESTIGATING: ICON_TONE.caution,
  ACTION_TAKEN: ICON_TONE.caution,
  RESOLVED: ICON_TONE.success,
  MANAGER_REVIEWED: ICON_TONE.success,
  DRAFT: ICON_TONE.muted,
  SCHEDULED: ICON_TONE.muted,
  UNASSIGNED: ICON_TONE.caution,
  ASSIGNED: ICON_TONE.info,
  EN_ROUTE: ICON_TONE.info,
  DUE: ICON_TONE.caution,
  CHECKED_IN: ICON_TONE.success,
  IN_PROGRESS: ICON_TONE.success,
  CHECKED_OUT: ICON_TONE.success,
  COMPLETED: ICON_TONE.success,
  COMPLETED_WITH_EXCEPTION: ICON_TONE.warning,
  CLOSED: ICON_TONE.muted,
  VERIFIED: ICON_TONE.success,
  PARTIALLY_VERIFIED: ICON_TONE.caution,
  MANUALLY_VERIFIED: ICON_TONE.info,
  UNVERIFIED: ICON_TONE.muted,
  DISPUTED: ICON_TONE.purple,
  REJECTED: ICON_TONE.danger,
  ATTENDANCE_VERIFICATION_PENDING: ICON_TONE.caution,
  FALSE_ECM_ALERT: ICON_TONE.info,
  LATE_NOTICE: ICON_TONE.caution,
  RETROSPECTIVE: ICON_TONE.info,
  APPROVAL_PENDING: ICON_TONE.caution,
  SU_INFORMED: ICON_TONE.info,
  SU_AGREED: ICON_TONE.success,
  MANAGER_APPROVED: ICON_TONE.success,
  ALLOWED: ICON_TONE.success,
  LOCKED: ICON_TONE.danger,
  OTHER: ICON_TONE.warning,
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

function BadgeIcon({ code, className }: { code: string; className?: string }) {
  const Icon = ICON_BY_CODE[code]
  if (!Icon) return null
  return (
    <Icon
      className={cn('size-3.5 shrink-0', ICON_COLOR_BY_CODE[code] ?? ICON_TONE.muted, className)}
      strokeWidth={2.25}
      aria-hidden
    />
  )
}

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
          <CircleHelp
            className={cn('size-3.5 shrink-0', ICON_TONE.muted)}
            strokeWidth={2.25}
            aria-hidden
          />
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
    <Badge
      variant="outline"
      className={cn(
        'font-normal',
        map[code] ?? GENERIC_CHIP_CLASS[code] ?? 'border-border',
        className,
      )}
    >
      <BadgeIcon code={code} />
      {humanize(code)}
    </Badge>
  )
}
