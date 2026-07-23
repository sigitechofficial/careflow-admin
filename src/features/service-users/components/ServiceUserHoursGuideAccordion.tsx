import { BookOpenText } from 'lucide-react'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'

export type OverPackageGuideServiceUser = {
  serviceUserId: string
  serviceUserName: string
  /** Weekly package (contracted) hours. */
  packageHours: number
  /** Assigned (scheduled) hours. */
  assignedHours: number
  overHours: number
}

type Props = {
  overPackageServiceUsers?: OverPackageGuideServiceUser[]
  serviceUserCount?: number
}

function formatHoursShort(n: number): string {
  return `${n.toFixed(n % 1 === 0 ? 0 : 2)}h`
}

export function ServiceUserHoursGuideAccordion({
  overPackageServiceUsers = [],
  serviceUserCount = 0,
}: Props) {
  const overCount = overPackageServiceUsers.length
  const denom = Math.max(serviceUserCount, 1)
  const sharePct = Math.min(100, Math.round((overCount / denom) * 100))
  const sorted = [...overPackageServiceUsers].sort((a, b) => b.overHours - a.overHours)

  return (
    <ContentCard className="p-0" data-testid="service-user-hours-guide">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <BookOpenText className="h-4 w-4 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-foreground">Over-package hours</p>
          <p className="text-xs text-muted-foreground">
            Service users whose assigned (scheduled) hours exceed their weekly package hours.
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3" data-testid="service-user-hours-guide-over-package">
        <div className="flex justify-end">
          <p className="text-sm font-semibold tabular-nums text-amber-900 dark:text-amber-200">
            {overCount} of {serviceUserCount}{' '}
            <span className="font-normal text-muted-foreground">({sharePct}%)</span>
          </p>
        </div>

        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={sharePct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${overCount} of ${serviceUserCount} service users over package`}
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-300',
              overCount > 0 ? 'bg-amber-500' : 'bg-success',
            )}
            style={{ width: `${overCount > 0 ? Math.max(sharePct, 4) : 100}%` }}
          />
        </div>

        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No service users are assigned above their weekly package this week.
          </p>
        ) : (
          <ul className="max-h-48 space-y-2.5 overflow-y-auto pr-1">
            {sorted.map(su => {
              const ratio =
                su.packageHours > 0 && su.assignedHours > 0
                  ? Math.min(100, Math.round((su.packageHours / su.assignedHours) * 100))
                  : 0
              return (
                <li key={su.serviceUserId} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-foreground">
                      {su.serviceUserName}
                    </span>
                    <span className="shrink-0 tabular-nums text-amber-900 dark:text-amber-200">
                      +{formatHoursShort(su.overHours)} over
                    </span>
                  </div>
                  <div
                    className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
                    title={`Package ${formatHoursShort(su.packageHours)} · Assigned ${formatHoursShort(su.assignedHours)}`}
                  >
                    <div className="absolute inset-0 bg-amber-200/80 dark:bg-amber-900/50" />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-amber-600"
                      style={{ width: `${Math.max(ratio, su.packageHours > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    Package {formatHoursShort(su.packageHours)} · Assigned{' '}
                    {formatHoursShort(su.assignedHours)}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </ContentCard>
  )
}
