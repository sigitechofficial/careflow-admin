import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import {
  formatVisitPlanWeeklyHours,
  summarizeVisitPlanWeeklyHours,
  type VisitPlanWeeklyHoursSummary,
} from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import type { VisitPlanDraftApproval, VisitPlanWeeklyHoursResult } from '@/features/service-users/visit-plan/api'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyInTimeZone } from '@/shared/lib/operational-day.util'

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
  const excessMinutes =
    contractedMinutes != null && plannedMinutes > contractedMinutes ? plannedMinutes - contractedMinutes : 0
  return {
    contractedHours,
    contractedMinutes,
    plannedMinutes,
    excessMinutes,
    isOverContract: excessMinutes > 0,
    isUnderContract: contractedMinutes != null && plannedMinutes < contractedMinutes && plannedMinutes > 0,
  }
}

function statusMessage(
  summary: VisitPlanWeeklyHoursSummary,
  fromServerCount: boolean,
  planOverLimit?: VisitPlanWeeklyHoursResult['planOverLimit'],
  draftApproved = false,
): string {
  if (summary.contractedMinutes == null) {
    return `Call pattern totals ${formatVisitPlanWeeklyHours(summary.plannedMinutes)} per week.`
  }
  if (summary.plannedMinutes <= 0) {
    return `No visits planned yet — ${formatVisitPlanWeeklyHours(summary.contractedMinutes)} a week available.`
  }
  if (summary.isOverContract) {
    if (fromServerCount && planOverLimit === 'WARN') {
      return `${formatVisitPlanWeeklyHours(summary.excessMinutes)} over the weekly contracted hours. Saving is still allowed (warning only, set in Settings).`
    }
    if (fromServerCount && planOverLimit === 'MANAGER_APPROVAL') {
      if (draftApproved) {
        return `${formatVisitPlanWeeklyHours(summary.excessMinutes)} over the weekly contracted hours — a manager approved this.`
      }
      return `${formatVisitPlanWeeklyHours(summary.excessMinutes)} over the weekly contracted hours. The draft can be saved, but a manager must approve it (Hours approvals) before it's activated.`
    }
    return fromServerCount
      ? `${formatVisitPlanWeeklyHours(summary.excessMinutes)} over the weekly contracted hours. Visits that go over can't be saved — increase the weekly hours first (manager approval).`
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
            {statusMessage(
              summary,
              Boolean(serverSummary),
              serverSummary?.planOverLimit,
              draftApprovalCovers(serverSummary?.draftApproval, summary.plannedMinutes),
            )}
          </p>
          {summary.isOverContract && serverSummary?.draftApproval ? (
            <DraftApprovalNote approval={serverSummary.draftApproval} plannedMinutes={summary.plannedMinutes} />
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

/** A manager approved this draft at its current busiest week (or a heavier one). */
function draftApprovalCovers(approval: VisitPlanDraftApproval | null | undefined, plannedMinutes: number) {
  return approval?.status === 'APPROVED' && approval.heaviestMinutes >= plannedMinutes
}

/** Where this draft's weekly-hours request stands (manager approval setting). */
function DraftApprovalNote({
  approval,
  plannedMinutes,
}: {
  approval: VisitPlanDraftApproval
  plannedMinutes: number
}) {
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const at = (iso: string | null) => (iso ? `${formatDate(dayKeyInTimeZone(iso))} ${formatTime(iso)}` : '')
  const by = approval.decidedByName ?? 'a manager'
  let text: string
  let tone: string
  if (draftApprovalCovers(approval, plannedMinutes)) {
    text = `Approved by ${by} on ${at(approval.decidedAt)} — the draft can be activated.`
    tone = 'text-emerald-800 dark:text-emerald-200'
  } else if (approval.status === 'REJECTED') {
    text = `Rejected by ${by} on ${at(approval.decidedAt)}: ${approval.decisionNotes || 'no reason given'}. It can't be activated — change the visits or increase the weekly hours, then save again.`
    tone = 'text-red-800 dark:text-red-200'
  } else {
    text = `Waiting for a manager's approval (Hours approvals) since ${at(approval.requestedAt)} — it can't be activated yet.`
    tone = 'text-amber-900 dark:text-amber-100'
  }
  return (
    <p className={cn('mt-1 text-xs font-medium', tone)} data-testid="visit-plan-draft-approval">
      {text}
    </p>
  )
}
