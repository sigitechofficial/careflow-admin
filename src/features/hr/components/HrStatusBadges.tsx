import { Badge } from '@/shared/ui/badge'
import type { EmployeeLifecycleStatus, HrDeploymentStatus } from '@/features/hr/api/hr.api'
import {
  deploymentStatusLabel,
  lifecycleStatusLabel,
} from '@/features/hr/utils/hr-display.util'
import { cn } from '@/shared/lib/utils'

const LIFECYCLE_TONES: Record<EmployeeLifecycleStatus, { badge: string; dot: string }> = {
  PRE_EMPLOYMENT: { badge: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  CLEARED: { badge: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  ONBOARDING: { badge: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  ACTIVE: {
    badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  ACTIVE_PAUSED: {
    badge: 'border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  LEAVING: { badge: 'border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
  LEFT: { badge: 'border-border bg-muted text-muted-foreground', dot: 'bg-muted-foreground/60' },
  ALUMNI: { badge: 'border-border bg-muted text-muted-foreground', dot: 'bg-muted-foreground/60' },
}

const DEPLOYMENT_TONES: Record<HrDeploymentStatus, { badge: string; dot: string }> = {
  GREEN: {
    badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  AMBER: { badge: 'border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
  RED: { badge: 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300', dot: 'bg-red-500' },
}

function DotBadge({ label, tone }: { label: string; tone: { badge: string; dot: string } }) {
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-normal', tone.badge)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)} aria-hidden />
      {label}
    </Badge>
  )
}

export function HrLifecycleBadge({ status }: { status: EmployeeLifecycleStatus }) {
  return <DotBadge label={lifecycleStatusLabel(status)} tone={LIFECYCLE_TONES[status] ?? LIFECYCLE_TONES.LEFT} />
}

export function HrDeploymentBadge({ status }: { status: HrDeploymentStatus }) {
  return <DotBadge label={deploymentStatusLabel(status)} tone={DEPLOYMENT_TONES[status] ?? DEPLOYMENT_TONES.RED} />
}

/** What each deployment status means (one place, shown wherever the status appears). */
export const DEPLOYMENT_LEGEND: { status: HrDeploymentStatus; title: string; meaning: string }[] = [
  { status: 'GREEN', title: 'Ready to deploy', meaning: 'Can be put on visits.' },
  {
    status: 'AMBER',
    title: 'At risk',
    meaning: 'Can work, but something needs attention soon (for example a DBS, training or supervision due).',
  },
  {
    status: 'RED',
    title: 'Not deployable',
    meaning: 'Must not be put on visits (for example an expired DBS, a suspension or an investigation).',
  },
]

export const DEPLOYMENT_LEGEND_NOTE =
  "HR sets this on each employee's HR profile. Lists show the worse of that and the employee's mandatory compliance (an expired DBS shows as Red). The rota gives no visits to anyone HR has set to Red or who has left, and warns for Amber; compliance problems follow the compliance allocation setting (warn or block)."

/** The deployment status key: a dot, the status and what it means. */
export function DeploymentStatusLegend({
  layout = 'row',
  showNote = true,
  className,
}: {
  /** `row`: one line each, side by side on wide screens. `stack`: one under another. */
  layout?: 'row' | 'stack'
  showNote?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <ul
        aria-label="Deployment status key"
        className={cn('gap-x-5 gap-y-1.5 text-xs', layout === 'row' ? 'grid sm:grid-cols-3' : 'grid')}
      >
        {DEPLOYMENT_LEGEND.map(item => (
          <li key={item.status} className="flex items-start gap-2">
            <span
              className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', DEPLOYMENT_TONES[item.status].dot)}
              aria-hidden
            />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {deploymentStatusLabel(item.status)} · {item.title}.
              </span>{' '}
              {item.meaning}
            </span>
          </li>
        ))}
      </ul>
      {showNote ? <p className="text-[11px] text-muted-foreground">{DEPLOYMENT_LEGEND_NOTE}</p> : null}
    </div>
  )
}
