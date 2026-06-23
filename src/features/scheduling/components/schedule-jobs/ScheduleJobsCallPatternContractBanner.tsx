import { AlertTriangle } from 'lucide-react'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { formatVisitPlanWeeklyHours } from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'

export type CallPatternOverContractRow = {
  serviceUserId: string
  plannedMinutes: number
  contractedHours: number
  excessMinutes: number
}

type Props = {
  rows: CallPatternOverContractRow[]
  allJobs: TimelineJob[]
  weekJobs: TimelineJob[]
}

export function ScheduleJobsCallPatternContractBanner({ rows, allJobs, weekJobs }: Props) {
  if (rows.length === 0) return null

  return (
    <div className="mb-3 shrink-0 rounded-lg border border-amber-300 bg-amber-50/90 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0 space-y-1 text-sm">
          <p className="font-medium text-amber-950 dark:text-amber-50">
            Call pattern exceeds weekly contracted hours
          </p>
          {rows.map((row) => {
            const suName =
              allJobs.find((job) => job.serviceUserId === row.serviceUserId)?.serviceUser ??
              weekJobs.find((job) => job.serviceUserId === row.serviceUserId)?.serviceUser
            const label = suName
              ? [suName.firstName, suName.lastName].filter(Boolean).join(' ').trim()
              : 'Service user'
            return (
              <p key={row.serviceUserId} className="text-xs text-amber-900 dark:text-amber-100">
                <strong className="font-semibold">{label}</strong>: call pattern plans{' '}
                {formatVisitPlanWeeklyHours(row.plannedMinutes)}/week but contract is{' '}
                {row.contractedHours}h ({formatVisitPlanWeeklyHours(row.excessMinutes)} over). Jobs
                beyond the contract show <strong className="font-semibold">amber stripes</strong> on
                the board — the rota is not blocked automatically.
              </p>
            )
          })}
        </div>
      </div>
    </div>
  )
}
