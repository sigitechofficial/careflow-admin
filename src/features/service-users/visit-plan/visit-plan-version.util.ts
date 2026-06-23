import type { ServiceUserVisitPlan, VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { visitPlanSlotMatchesDay } from '@/features/service-users/visit-plan/visit-plan-schedule-match.util'
import { formatDate } from '@/shared/lib/utils'

export function visitPlanEnabledSlots(slots: VisitPlanSlot[] | undefined): VisitPlanSlot[] {
  return (slots ?? []).filter((slot) => slot.isEnabled)
}

/** Enabled slots that would occur on a given UTC weekday (0=Sun … 6=Sat). */
export function visitPlanCallsOnWeekday(
  slots: VisitPlanSlot[] | undefined,
  weekday: number,
  anchorIso: string,
): number {
  const anchor = anchorIso.slice(0, 10)
  const anchorDate = new Date(`${anchor}T12:00:00Z`)
  const day = new Date(`${anchor}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + ((weekday - day.getUTCDay() + 7) % 7))
  return (slots ?? []).filter(
    (slot) => slot.isEnabled && visitPlanSlotMatchesDay(slot, day, anchorDate),
  ).length
}

/** Human summary of how many calls run on typical weekdays (Mon–Fri). */
export function summarizeVisitPlanDailyCalls(plan: ServiceUserVisitPlan): string {
  const anchor = plan.effectiveFrom?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  const slots = plan.slots ?? []
  const enabled = visitPlanEnabledSlots(slots)
  if (enabled.length === 0) return 'No active calls'

  const weekdayCounts = [1, 2, 3, 4, 5].map((dow) => visitPlanCallsOnWeekday(slots, dow, anchor))
  const positive = weekdayCounts.filter((n) => n > 0)
  if (positive.length === 0) {
    return `${enabled.length} active slot${enabled.length === 1 ? '' : 's'} (not on Mon–Fri)`
  }

  const max = Math.max(...weekdayCounts)
  const min = Math.min(...positive)
  if (min === max) {
    return `${max} call${max === 1 ? '' : 's'} per weekday`
  }
  return `Up to ${max} calls per weekday (${enabled.length} active slots)`
}

export function visitPlanDateOnlyUtc(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`)
}

export function visitPlanTodayUtc(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/** Active package with a future effectiveTo — visits continue until that date. */
export function isScheduledVisitPlanEnd(plan: ServiceUserVisitPlan): boolean {
  if (plan.status !== 'ACTIVE' || !plan.effectiveTo) return false
  return visitPlanDateOnlyUtc(plan.effectiveTo).getTime() > visitPlanTodayUtc().getTime()
}

export function formatVisitPlanEffectiveRange(plan: ServiceUserVisitPlan): string {
  const from = plan.effectiveFrom ? formatDate(plan.effectiveFrom) : '—'
  if (plan.effectiveTo) {
    if (isScheduledVisitPlanEnd(plan)) {
      return `${from} – ends ${formatDate(plan.effectiveTo)} (scheduled)`
    }
    return `${from} – ${formatDate(plan.effectiveTo)}`
  }
  if (plan.status === 'ACTIVE') return `${from} – ongoing`
  if (plan.status === 'DRAFT') return `${from} – not activated`
  if (plan.status === 'ENDED') return `${from} – ended (date not recorded)`
  return from
}

export function visitPlanVersionShortLabel(plan: ServiceUserVisitPlan): string {
  const calls = summarizeVisitPlanDailyCalls(plan)
  return `${plan.status} · ${calls} · ${formatVisitPlanEffectiveRange(plan)}`
}

const STATUS_SORT_RANK: Record<ServiceUserVisitPlan['status'], number> = {
  ACTIVE: 0,
  SUSPENDED: 1,
  DRAFT: 2,
  ENDED: 3,
}

/** Active/suspended/draft first; ended plans by most recently ended first. */
export function sortVisitPlanVersions(plans: ServiceUserVisitPlan[]): ServiceUserVisitPlan[] {
  return [...plans].sort((a, b) => {
    const rankDiff = STATUS_SORT_RANK[a.status] - STATUS_SORT_RANK[b.status]
    if (rankDiff !== 0) return rankDiff
    if (a.status === 'ENDED' && b.status === 'ENDED') {
      const endA = a.effectiveTo ?? a.updatedAt
      const endB = b.effectiveTo ?? b.updatedAt
      return new Date(endB).getTime() - new Date(endA).getTime()
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

/** Non-ended packages that can still be edited on Set up visits. */
export function editableVisitPlans(plans: ServiceUserVisitPlan[]): ServiceUserVisitPlan[] {
  return sortVisitPlanVersions(plans).filter((p) => p.status !== 'ENDED')
}

/** Plan shown on Set up visits / contracted-hours checks: active, then suspended, then draft. */
export function resolveEditableVisitPlan(
  plans: ServiceUserVisitPlan[],
  activePlan: ServiceUserVisitPlan | null | undefined,
  preferredPlanId?: string | null,
  plansFetched = true,
): ServiceUserVisitPlan | null {
  if (preferredPlanId?.trim()) {
    const preferred = plans.find((p) => p.id === preferredPlanId && p.status !== 'ENDED')
    if (preferred) return preferred
  }

  if (plansFetched && plans.length === 0) return null

  const activeInList = activePlan?.id
    ? plans.find((p) => p.id === activePlan.id && p.status === 'ACTIVE')
    : null
  if (activeInList) return activeInList

  if (!plansFetched && activePlan?.id?.trim() && activePlan.status === 'ACTIVE') {
    return activePlan
  }

  const sorted = sortVisitPlanVersions(plans)
  return sorted.find((p) => p.status === 'SUSPENDED' || p.status === 'DRAFT') ?? null
}

export function visitPlanEndedCount(plans: ServiceUserVisitPlan[]): number {
  return plans.filter((p) => p.status === 'ENDED').length
}

/** 1 = most recently ended, higher = older ended package. */
export function visitPlanEndedRank(plans: ServiceUserVisitPlan[], planId: string): number | null {
  const ended = sortVisitPlanVersions(plans).filter((p) => p.status === 'ENDED')
  const idx = ended.findIndex((p) => p.id === planId)
  return idx >= 0 ? idx + 1 : null
}

export function formatVisitPlanStatusLabel(
  plan: ServiceUserVisitPlan,
  allPlans: ServiceUserVisitPlan[],
): string {
  if (plan.status !== 'ENDED') return plan.status
  const endedCount = visitPlanEndedCount(allPlans)
  if (endedCount <= 1) return 'ENDED'
  const rank = visitPlanEndedRank(allPlans, plan.id)
  if (rank === 1) return 'ENDED (most recent)'
  if (rank === endedCount) return 'ENDED (oldest)'
  return rank != null ? `ENDED (${rank} of ${endedCount})` : 'ENDED'
}
