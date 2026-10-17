import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'

type OverlapSlot = Pick<
  VisitPlanSlot,
  | 'slotCode'
  | 'label'
  | 'isEnabled'
  | 'daysOfWeek'
  | 'plannedStartTime'
  | 'plannedEndTime'
  | 'scheduleFrequency'
  | 'slotKind'
  | 'slotEffectiveFrom'
  | 'slotEffectiveTo'
>

function minutes(hm: string): number | null {
  const m = /^(\d{2}):(\d{2})/.exec(hm ?? '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** A stretch of a visit on one weekday: `dayOffset` 1 is the morning after a visit that runs past midnight. */
type DayRange = { dayOffset: 0 | 1; start: number; end: number }

/** Clock ranges of a visit; a visit that ends on or before its start runs past midnight into the next day. */
function dayRanges(slot: OverlapSlot): DayRange[] {
  const start = minutes(slot.plannedStartTime)
  const end = minutes(slot.plannedEndTime)
  if (start == null || end == null) return []
  if (end > start) return [{ dayOffset: 0, start, end }]
  const ranges: DayRange[] = [{ dayOffset: 0, start, end: 1440 }]
  if (end > 0) ranges.push({ dayOffset: 1, start: 0, end })
  return ranges
}

/** Weekdays (0 = Sunday) a range falls on, for a visit that starts on `days`. */
function rangeDays(days: number[], range: DayRange): number[] {
  return days.map((d) => (d + range.dayOffset) % 7)
}

function dateRangesIntersect(a: OverlapSlot, b: OverlapSlot): boolean {
  const from = (s: OverlapSlot) => s.slotEffectiveFrom?.slice(0, 10) ?? ''
  const to = (s: OverlapSlot) => s.slotEffectiveTo?.slice(0, 10) ?? '9999-12-31'
  return from(a) <= to(b) && from(b) <= to(a)
}

/** Weekly day-of-week patterns only — monthly and one-off visits are not compared. */
function comparable(slot: OverlapSlot): boolean {
  return slot.scheduleFrequency !== 'MONTHLY' && slot.slotKind !== 'ONE_OFF'
}

export type VisitOverlap = { other: OverlapSlot; days: number[] }

/**
 * Another switched-on visit of the same service user that shares a weekday and a clock time with
 * `visit`. Used when a visit is added or edited, so two visits are never planned at the same time.
 */
export function findVisitPlanVisitOverlap(visit: OverlapSlot, others: OverlapSlot[]): VisitOverlap | null {
  if (!comparable(visit)) return null
  const mine = dayRanges(visit)
  for (const other of others) {
    if (!other.isEnabled || other.slotCode === visit.slotCode || !comparable(other)) continue
    if (!dateRangesIntersect(visit, other)) continue
    const theirs = dayRanges(other)
    // Weekdays (as `visit` start days) on which some stretch of the two visits overlaps.
    const days = new Set<number>()
    for (const a of mine) {
      for (const b of theirs) {
        if (!(a.start < b.end && b.start < a.end)) continue
        const otherDays = new Set(rangeDays(other.daysOfWeek, b))
        visit.daysOfWeek.forEach((d) => {
          if (otherDays.has((d + a.dayOffset) % 7)) days.add(d)
        })
      }
    }
    if (days.size) return { other, days: [...days].sort() }
  }
  return null
}

const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0]

export function formatVisitPlanWeekdays(days: number[]): string {
  const set = new Set(days)
  if (set.size === 7) return 'every day'
  return MONDAY_FIRST.filter((d) => set.has(d))
    .map((d) => VISIT_PLAN_DAY_LABELS[d])
    .join(', ')
}

export function describeVisitPlanVisitOverlap(overlap: VisitOverlap): string {
  const { other, days } = overlap
  return `This overlaps the ${other.label} visit at ${other.plannedStartTime}–${other.plannedEndTime} on ${formatVisitPlanWeekdays(days)}. Change the time or the days.`
}
