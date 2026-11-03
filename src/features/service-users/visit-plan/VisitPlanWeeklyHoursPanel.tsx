import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  formatVisitPlanWeeklyHours,
  summarizeVisitPlanWeeklyHours,
  type VisitPlanWeeklyHoursSummary,
} from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import type { VisitPlanWeeklyHoursResult } from '@/features/service-users/visit-plan/api'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'

type Props = {
  slots: VisitPlanSlot[]
  weeklyContractedHours: string
  anchorIso?: string | null
  /**
   * Server count (busiest of the next weeks, double-ups, dates, extra visits). When given it
   * replaces the quick count from `slots`.
   */
  serverSummary?: VisitPlanWeeklyHoursResult | null
  className?: string
}

/** Server count shaped like the quick count, using the busiest week. */
function fromServer(server: VisitPlanWeeklyHoursResult): VisitPlanWeeklyHoursSummary {
  const contractedHours = server.limitWeeklyHours
  const contractedMinutes = contractedHours != null ? Math.round(contractedHours * 60) : null
  const plannedMinutes = server.heaviestWeek?.minutes ?? 0
  // Hours the busiest week's visits hold from the timebank are paid for: not over.
  const fromTimebank = busiestWeekTimebankMinutes(server)
  const excessMinutes =
    contractedMinutes != null && plannedMinutes > contractedMinutes + fromTimebank
      ? plannedMinutes - contractedMinutes - fromTimebank
      : 0
  return {
    contractedHours,
    contractedMinutes,
    plannedMinutes,
    excessMinutes,
    isOverContract: excessMinutes > 0,
    isUnderContract: contractedMinutes != null && plannedMinutes < contractedMinutes && plannedMinutes > 0,
  }
}

function busiestWeekTimebankMinutes(server: VisitPlanWeeklyHoursResult): number {
  const weekStart = server.heaviestWeek?.weekStart
  return server.weeks.find((w) => w.weekStart === weekStart)?.timebankMinutes ?? 0
}

function statusMessage(
  summary: VisitPlanWeeklyHoursSummary,
  fromServerCount: boolean,
  visitsNeedApproval?: VisitPlanWeeklyHoursResult['visitsNeedApproval'],
): string {
  if (summary.contractedMinutes == null) {
    return `Call pattern totals ${formatVisitPlanWeeklyHours(summary.plannedMinutes)} per week.`
  }
  if (summary.plannedMinutes <= 0) {
    return `No visits planned yet — ${formatVisitPlanWeeklyHours(summary.contractedMinutes)} a week available.`
  }
  if (summary.isOverContract) {
    if (fromServerCount && visitsNeedApproval === false) {
      return `${formatVisitPlanWeeklyHours(summary.excessMinutes)} over the weekly contracted hours. The visits are still made (warning only, set in Settings).`
    }
    return fromServerCount
      ? `${formatVisitPlanWeeklyHours(summary.excessMinutes)} over the weekly contracted hours. The plan can be saved; when the rota is made, the visits over the hours go to Hours approvals and are made only once a manager approves.`
      : `${formatVisitPlanWeeklyHours(summary.excessMinutes)} over weekly contract — excess visits show amber stripes on Schedule Jobs (rota is not blocked).`
  }
  if (summary.isUnderContract) {
    return `Within contract — ${formatVisitPlanWeeklyHours((summary.contractedMinutes ?? 0) - summary.plannedMinutes)} remaining in the package.`
  }
  return 'Call pattern matches weekly contracted hours.'
}

export function VisitPlanWeeklyHoursPanel({
  slots,
  weeklyContractedHours,
  anchorIso,
  serverSummary,
  className,
}: Props) {
  const { formatDate } = useOrganisationDisplayFormat()
  const summary = serverSummary
    ? fromServer(serverSummary)
    : summarizeVisitPlanWeeklyHours(slots, weeklyContractedHours, {
        anchorIso: anchorIso ?? undefined,
      })
  const busiestWeek = serverSummary?.heaviestWeek ?? null
  const sleepInNights = serverSummary
    ? Math.max(0, ...serverSummary.weeks.map((w) => w.sleepInNights))
    : 0
  const busiestFromTimebank = serverSummary ? busiestWeekTimebankMinutes(serverSummary) : 0
  const timebank = serverSummary?.timebank ?? null
  const showTimebank = timebank != null && (timebank.useTimebank || timebank.availableMinutes > 0)

  if (summary.plannedMinutes <= 0 && summary.contractedMinutes == null) return null

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3',
        summary.isOverContract
          ? 'border-amber-300 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30'
          : summary.contractedMinutes != null && !summary.isUnderContract && summary.plannedMinutes > 0
            ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/25'
            : 'border-border bg-muted/20',
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        {summary.isOverContract ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        ) : summary.contractedMinutes != null && !summary.isUnderContract && summary.plannedMinutes > 0 ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>
              <span className="text-muted-foreground">
                {serverSummary ? 'Planned (busiest week):' : 'Planned from call pattern:'}
              </span>{' '}
              <strong className="font-semibold text-foreground">
                {formatVisitPlanWeeklyHours(summary.plannedMinutes)}
              </strong>
              <span className="text-muted-foreground">
                {busiestWeek ? ` · week of ${formatDate(busiestWeek.weekStart)}` : ' / week'}
              </span>
            </span>
            {summary.contractedHours != null ? (
              <span>
                <span className="text-muted-foreground">Weekly contract:</span>{' '}
                <strong className="font-semibold text-foreground">{summary.contractedHours}h</strong>
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              'mt-1 text-xs',
              summary.isOverContract ? 'text-amber-900 dark:text-amber-100' : 'text-muted-foreground',
            )}
          >
            {statusMessage(summary, Boolean(serverSummary), serverSummary?.visitsNeedApproval)}
          </p>
          {serverSummary?.edge ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Counted from the visits on the rota, this week to {formatDate(serverSummary.edge)} (the rota horizon); the
              last week may be partly made yet.
            </p>
          ) : null}
          {busiestFromTimebank > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground" data-testid="visit-plan-hours-timebank-week">
              {formatVisitPlanWeeklyHours(busiestFromTimebank)} of the busiest week is paid from the timebank.
            </p>
          ) : null}
          {showTimebank ? (
            <p className="mt-1 text-xs text-muted-foreground" data-testid="visit-plan-hours-timebank">
              Timebank: {formatVisitPlanWeeklyHours(Math.max(0, timebank.availableMinutes))} available
              {timebank.useTimebank
                ? ' — used automatically for visits over the weekly hours.'
                : ' (not used automatically, set in Settings).'}
            </p>
          ) : null}
          {sleepInNights > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Includes up to {sleepInNights} sleep-in night{sleepInNights === 1 ? '' : 's'} a week — their full
              hours count towards the weekly contracted hours.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
