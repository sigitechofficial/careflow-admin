import { Crown, User } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { VisitPlanSlotCarerRole } from '@/features/service-users/visit-plan/types'
import { formatCarerAssignmentRoleLabel } from '@/features/service-users/visit-plan/visit-plan-carer-by-day.util'

type Props = {
  role: VisitPlanSlotCarerRole
  className?: string
  size?: 'sm' | 'md'
  /** Override badge text (e.g. Support 1 / Support 2). */
  label?: string
}

/** Lead / Secondary / Support N badge for multi-carer visit plan assignments. */
export function VisitPlanCarerRoleBadge({ role, className, size = 'sm', label }: Props) {
  const isLead = role === 'LEAD'
  const Icon = isLead ? Crown : User
  const text = label ?? formatCarerAssignmentRoleLabel(role)
  const title = isLead
    ? 'Lead carer for this visit'
    : label
      ? `${label} for this visit`
      : 'Secondary carer for this visit'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        isLead
          ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100'
          : 'border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200',
        className,
      )}
      title={title}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
      {text}
    </span>
  )
}
