import { Badge } from '@/shared/ui/badge'
import type { EmployeeLifecycleStatus, HrDeploymentStatus } from '@/features/hr/api/hr.api'
import {
  deploymentStatusLabel,
  lifecycleStatusLabel,
} from '@/features/hr/utils/hr-display.util'
import { cn } from '@/shared/lib/utils'

export function HrLifecycleBadge({ status }: { status: EmployeeLifecycleStatus }) {
  return (
    <Badge variant="outline" className="font-normal">
      {lifecycleStatusLabel(status)}
    </Badge>
  )
}

export function HrDeploymentBadge({ status }: { status: HrDeploymentStatus }) {
  const tone =
    status === 'GREEN'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
      : status === 'AMBER'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
        : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'

  return (
    <Badge variant="outline" className={cn('font-normal', tone)}>
      {deploymentStatusLabel(status)}
    </Badge>
  )
}
