import type { VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'

export type CarerWeeklyHoursTone = 'normal' | 'atLimit' | 'over'

export type CarerWeeklyHoursSummary = {
  /** Full sentence (tooltip / older layouts). */
  text: string
  tone: CarerWeeklyHoursTone
  /** Picker row line 1, e.g. "Booked 40h · Done 24h · Limit 40h". */
  statsLine: string
  /** Picker row line 2, e.g. "This visit +1h → 1h over limit". */
  visitLine: string
}

/** 10 → "10h", 10.5 → "10.5h". */
function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}h`
}

/**
 * Weekly hours for the carer picker / assigned card.
 * - Booked: hours the carer already has in the week shown (this visit left out), counted like
 *   the hours approvals — rota visits (plan, extra, special) and plan visits not on the rota yet.
 * - Done: hours of COMPLETED visits in the current rota week.
 * - Limit: contracted weekly hours.
 * `includesThisVisit` — the carer is on this visit, so the full sentence counts it as assigned.
 * `weekLabel` — e.g. "Week of 09/11/2026" (the visit's week, or the busiest coming week).
 * Returns null while hours are not loaded yet (placeholder candidates).
 */
export function summarizeCarerWeeklyHours(
  c: Pick<
    VisitPlanCarerCandidate,
    | 'contractedWeeklyHours'
    | 'allowedWeeklyHours'
    | 'assignedWeeklyHours'
    | 'projectedWeeklyHours'
    | 'completedWeeklyHours'
    | 'exceedsContractedHours'
  >,
  includesThisVisit: boolean,
  weekLabel?: string | null,
): CarerWeeklyHoursSummary | null {
  const weekPrefix = weekLabel ? `${weekLabel}: ` : ''
  if (c.contractedWeeklyHours === undefined && c.allowedWeeklyHours === undefined) return null
  const otherHours = c.assignedWeeklyHours ?? 0
  const withVisit = c.projectedWeeklyHours ?? otherHours
  const visitHours = Math.max(0, withVisit - otherHours)
  const assigned = includesThisVisit ? withVisit : otherHours
  const assignedText = includesThisVisit
    ? `${formatHours(assigned)} assigned incl. this visit`
    : `${formatHours(assigned)} assigned`
  const doneText = `Done ${formatHours(c.completedWeeklyHours ?? 0)}`

  const limit = c.allowedWeeklyHours ?? c.contractedWeeklyHours ?? null
  if (limit == null || limit <= 0) {
    return {
      text: `${weekLabel ? weekPrefix : 'This week: '}${assignedText} · weekly limit not set`,
      tone: 'normal',
      statsLine: `${weekPrefix}Booked ${formatHours(otherHours)} · ${doneText} · No limit set`,
      visitLine: `This visit +${formatHours(visitHours)}`,
    }
  }

  const isApprovedExtra =
    c.allowedWeeklyHours != null && c.allowedWeeklyHours !== c.contractedWeeklyHours
  const limitText = `limit ${formatHours(limit)}${isApprovedExtra ? ' (approved extra)' : ''}`

  const left = limit - assigned
  const leftText =
    left >= -0.01 ? `${formatHours(Math.max(0, left))} left` : `${formatHours(-left)} over`
  let text = `${weekLabel ? weekPrefix : 'This week: '}${assignedText} · ${limitText} · ${leftText}`

  if (!includesThisVisit) {
    const overAfter = withVisit - limit
    text +=
      overAfter > 0.01
        ? ` · with this visit ${formatHours(withVisit)} (${formatHours(overAfter)} over)`
        : ` · with this visit ${formatHours(withVisit)}`
  }

  // The server decides "over" with the grace in Settings → Dom Rules; within the grace reads as at limit.
  const tone: CarerWeeklyHoursTone =
    (c.exceedsContractedHours ?? withVisit > limit + 0.01)
      ? 'over'
      : withVisit >= limit - 0.01
        ? 'atLimit'
        : 'normal'

  const leftAfter = limit - withVisit
  return {
    text,
    tone,
    statsLine: `${weekPrefix}Booked ${formatHours(otherHours)} · ${doneText} · Limit ${formatHours(limit)}${
      isApprovedExtra ? ' (approved extra)' : ''
    }`,
    visitLine:
      leftAfter >= -0.01
        ? `This visit +${formatHours(visitHours)} → ${formatHours(Math.max(0, leftAfter))} left`
        : `This visit +${formatHours(visitHours)} → ${formatHours(-leftAfter)} over limit`,
  }
}
