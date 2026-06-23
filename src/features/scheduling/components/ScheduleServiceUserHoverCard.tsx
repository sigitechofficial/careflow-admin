import type { ServiceUserBrief } from '@/features/scheduling/types/scheduling.types'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import { formatServiceUserBranchLabel } from '@/features/settings/location-management/format-service-user-branch-label'

type Props = {
  serviceUser: ServiceUserBrief
  jobCount: number
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-0.5 text-xs leading-snug">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

export function ScheduleServiceUserHoverCard({ serviceUser, jobCount }: Props) {
  const name = serviceUserLabel(serviceUser)
  const branchLabel = formatServiceUserBranchLabel(serviceUser)
  const visitsToday = jobCount === 1 ? '1 visit today' : `${jobCount} visits today`

  return (
    <div className="w-[min(22rem,88vw)] rounded-md border border-border bg-popover shadow-lg">
      <div className="border-b border-border px-3 py-2 text-center text-sm font-semibold text-violet-700 dark:text-violet-300">
        Service user
      </div>
      <div className="space-y-2 px-3 py-2.5">
        <DetailRow label="Name" value={name} />
        {serviceUser.serviceUserNumber?.trim() ? (
          <DetailRow label="SU number" value={serviceUser.serviceUserNumber.trim()} />
        ) : null}
        <DetailRow label="Branch" value={branchLabel} />
        <DetailRow label="Today" value={visitsToday} />
      </div>
    </div>
  )
}
