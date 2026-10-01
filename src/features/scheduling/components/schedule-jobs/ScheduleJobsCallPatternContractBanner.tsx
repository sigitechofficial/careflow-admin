import * as React from 'react'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type {
  CarerOverContractRow,
  ServiceUserOverPackageRow,
} from '@/features/scheduling/utils/schedule-jobs-contracted-hours.util'
import { formatVisitPlanWeeklyHours } from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'

type OverAllocationTab = 'carers' | 'service-users'

type Props = {
  serviceUserRows: ServiceUserOverPackageRow[]
  carerRows: CarerOverContractRow[]
  allJobs: TimelineJob[]
  weekJobs: TimelineJob[]
  employeeNameById: Map<string, string>
  onViewServiceUserVisits: (serviceUserId: string) => void
  onViewCarerVisits: (employeeId: string) => void
}

function formatHoursMinutesDisplay(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

function serviceUserLabel(
  serviceUserId: string,
  allJobs: TimelineJob[],
  weekJobs: TimelineJob[],
): string {
  const su =
    allJobs.find((job) => job.serviceUserId === serviceUserId)?.serviceUser ??
    weekJobs.find((job) => job.serviceUserId === serviceUserId)?.serviceUser
  if (!su) return 'Service user'
  return [su.firstName, su.lastName].filter(Boolean).join(' ').trim() || 'Service user'
}

function percentOver(excessMinutes: number, limitMinutes: number): number {
  if (limitMinutes <= 0) return 0
  return Math.round((excessMinutes / limitMinutes) * 100)
}

function summaryLine(carerCount: number, serviceUserCount: number): string {
  const parts: string[] = []
  if (carerCount > 0) {
    parts.push(`${carerCount} carer${carerCount === 1 ? '' : 's'} over contract`)
  }
  if (serviceUserCount > 0) {
    parts.push(`${serviceUserCount} service user${serviceUserCount === 1 ? '' : 's'} over package`)
  }
  return parts.join(' · ')
}

type AllocationBarProps = {
  scheduledMinutes: number
  limitMinutes: number
  excessMinutes: number
  scaleMinutes: number
  limitLabel: string
  overLabel: string
}

function AllocationProgressBar({
  scheduledMinutes,
  limitMinutes,
  excessMinutes,
  scaleMinutes,
  limitLabel,
  overLabel,
}: AllocationBarProps) {
  const filledPercent = scaleMinutes > 0 ? (scheduledMinutes / scaleMinutes) * 100 : 0
  const withinLimitPercent =
    scheduledMinutes > 0 ? (Math.min(scheduledMinutes, limitMinutes) / scheduledMinutes) * 100 : 0
  const overPercent = scheduledMinutes > 0 ? (excessMinutes / scheduledMinutes) * 100 : 0

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800/60">
        <div
          className="flex h-full min-w-0"
          style={{ width: `${Math.min(100, filledPercent)}%` }}
        >
          {withinLimitPercent > 0 ? (
            <div
              className="h-full bg-emerald-600 dark:bg-emerald-500"
              style={{ width: `${withinLimitPercent}%` }}
              title={limitLabel}
            />
          ) : null}
          {overPercent > 0 ? (
            <div
              className="h-full bg-amber-700 dark:bg-amber-600"
              style={{ width: `${overPercent}%` }}
              title={overLabel}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function ScheduleJobsCallPatternContractBanner({
  serviceUserRows,
  carerRows,
  allJobs,
  weekJobs,
  employeeNameById,
  onViewServiceUserVisits,
  onViewCarerVisits,
}: Props) {
  const [tab, setTab] = React.useState<OverAllocationTab>(() =>
    serviceUserRows.length > 0 ? 'service-users' : 'carers',
  )

  React.useEffect(() => {
    if (tab === 'service-users' && serviceUserRows.length === 0 && carerRows.length > 0) {
      setTab('carers')
    } else if (tab === 'carers' && carerRows.length === 0 && serviceUserRows.length > 0) {
      setTab('service-users')
    }
  }, [tab, serviceUserRows.length, carerRows.length])

  if (serviceUserRows.length === 0 && carerRows.length === 0) return null

  const activeRows = tab === 'service-users' ? serviceUserRows : carerRows
  const scaleMinutes = Math.max(
    ...activeRows.map((row) => row.scheduledMinutes),
    ...activeRows.map((row) => ('packageMinutes' in row ? row.packageMinutes : row.contractMinutes)),
    1,
  )
  const totalExcessMinutes = activeRows.reduce((sum, row) => sum + row.excessMinutes, 0)
  const limitLegendLabel = tab === 'service-users' ? 'Package hours' : 'Contract hours'
  const overLegendLabel = tab === 'service-users' ? 'Over package' : 'Over contract'

  return (
    <details
      className={cn(
        'group mb-3 shrink-0 overflow-hidden rounded-lg border border-amber-300 bg-amber-50/90',
        'dark:border-amber-900 dark:bg-amber-950/30',
      )}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-950',
          'dark:text-amber-50 [&::-webkit-details-marker]:hidden',
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-amber-700 transition-transform group-open:rotate-90 dark:text-amber-300" />
        <span className="min-w-0 flex-1 text-left leading-tight">
          <span className="font-semibold">Over-allocation this week</span>
          <span className="ml-1.5 font-normal text-amber-900/80 dark:text-amber-100/80">
            {summaryLine(carerRows.length, serviceUserRows.length)}
          </span>
        </span>
      </summary>

      <div className="space-y-2 border-t border-amber-300/80 px-3 py-2 dark:border-amber-900/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab('carers')}
            disabled={carerRows.length === 0}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
              tab === 'carers'
                ? 'border-amber-400 bg-white text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50'
                : 'border-transparent bg-amber-100/80 text-amber-900 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-100',
              carerRows.length === 0 && 'cursor-not-allowed opacity-50',
            )}
          >
            Carers over contract ({carerRows.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('service-users')}
            disabled={serviceUserRows.length === 0}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
              tab === 'service-users'
                ? 'border-amber-400 bg-white text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50'
                : 'border-transparent bg-amber-100/80 text-amber-900 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-100',
              serviceUserRows.length === 0 && 'cursor-not-allowed opacity-50',
            )}
          >
            Service users over package ({serviceUserRows.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] leading-tight text-amber-900/90 dark:text-amber-100/90">
          <p className="min-w-0 flex-1">
            {tab === 'service-users' ? (
              <>More care scheduled than funded package — check package or reassign visits.</>
            ) : (
              <>More visits booked than contracted weekly hours — review allocations.</>
            )}{' '}
            <span className="font-medium">
              Total {formatVisitPlanWeeklyHours(totalExcessMinutes)} over.
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-3 text-amber-900/80 dark:text-amber-200/80">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-emerald-600 dark:bg-emerald-500" aria-hidden />
              {limitLegendLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-amber-700 dark:bg-amber-600" aria-hidden />
              {overLegendLabel}
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-amber-200/80 bg-white dark:border-amber-900/60 dark:bg-background">
          <div className="hidden gap-3 border-b border-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] dark:border-amber-900/40">
            <span>{tab === 'service-users' ? 'Service user' : 'Carer'}</span>
            <span>{tab === 'service-users' ? 'Scheduled hours vs package' : 'Scheduled hours vs contract'}</span>
            <span className="text-right">Over by</span>
          </div>

          <ul className="divide-y divide-amber-100 dark:divide-amber-900/40">
            {tab === 'service-users'
              ? serviceUserRows.map((row) => {
                  const name = serviceUserLabel(row.serviceUserId, allJobs, weekJobs)
                  const overPct = percentOver(row.excessMinutes, row.packageMinutes)
                  return (
                    <li
                      key={row.serviceUserId}
                      className="flex flex-col gap-2 px-3 py-1.5 sm:grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] sm:items-center sm:gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold leading-tight text-foreground">{name}</p>
                        <p className="text-[11px] leading-tight text-muted-foreground">
                          {formatHoursMinutesDisplay(row.scheduledMinutes)} scheduled ·{' '}
                          {formatHoursMinutesDisplay(row.packageMinutes)} package
                        </p>
                      </div>
                      <AllocationProgressBar
                        scheduledMinutes={row.scheduledMinutes}
                        limitMinutes={row.packageMinutes}
                        excessMinutes={row.excessMinutes}
                        scaleMinutes={scaleMinutes}
                        limitLabel={limitLegendLabel}
                        overLabel={overLegendLabel}
                      />
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <div className="text-right leading-tight">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                            +{formatVisitPlanWeeklyHours(row.excessMinutes)}
                            <span className="ml-1 font-normal text-muted-foreground">({overPct}%)</span>
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0 px-2.5 text-[11px] border-amber-300 text-amber-900 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-100 dark:hover:bg-amber-950/50"
                          onClick={() => onViewServiceUserVisits(row.serviceUserId)}
                        >
                          View visits
                        </Button>
                      </div>
                    </li>
                  )
                })
              : carerRows.map((row) => {
                  const name = employeeNameById.get(row.employeeId) ?? 'Carer'
                  const overPct = percentOver(row.excessMinutes, row.contractMinutes)
                  return (
                    <li
                      key={row.employeeId}
                      className="flex flex-col gap-2 px-3 py-1.5 sm:grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] sm:items-center sm:gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold leading-tight text-foreground">{name}</p>
                        <p className="text-[11px] leading-tight text-muted-foreground">
                          {formatHoursMinutesDisplay(row.scheduledMinutes)} scheduled ·{' '}
                          {formatHoursMinutesDisplay(row.contractMinutes)} contract
                        </p>
                      </div>
                      <AllocationProgressBar
                        scheduledMinutes={row.scheduledMinutes}
                        limitMinutes={row.contractMinutes}
                        excessMinutes={row.excessMinutes}
                        scaleMinutes={scaleMinutes}
                        limitLabel={limitLegendLabel}
                        overLabel={overLegendLabel}
                      />
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <div className="text-right leading-tight">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                            +{formatVisitPlanWeeklyHours(row.excessMinutes)}
                            <span className="ml-1 font-normal text-muted-foreground">({overPct}%)</span>
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0 px-2.5 text-[11px] border-amber-300 text-amber-900 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-100 dark:hover:bg-amber-950/50"
                          onClick={() => onViewCarerVisits(row.employeeId)}
                        >
                          View visits
                        </Button>
                      </div>
                    </li>
                  )
                })}
          </ul>
        </div>
      </div>
    </details>
  )
}
