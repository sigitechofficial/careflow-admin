import type { VisitPlanCarerCandidate, VisitPlanCarerFit } from '@/features/service-users/visit-plan/types'

const FIT_RANK: Record<VisitPlanCarerFit, number> = { good: 0, partial: 1, poor: 2 }

const unique = <T,>(values: T[]) => [...new Set(values)]

/**
 * One carer list for several visits from each visit's suggestions: only carers suggested for every
 * visit, with the weakest match, any block or clash, and the visits' hours added together.
 */
export function mergeBulkCarerCandidates(perVisit: VisitPlanCarerCandidate[][]): VisitPlanCarerCandidate[] {
  if (perVisit.length === 0) return []
  const [first, ...rest] = perVisit
  const restById = rest.map((list) => new Map(list.map((c) => [c.employeeId, c])))

  const merged: VisitPlanCarerCandidate[] = []
  for (const base of first ?? []) {
    const others = restById.map((byId) => byId.get(base.employeeId))
    if (others.some((c) => !c)) continue
    const all = [base, ...(others as VisitPlanCarerCandidate[])]

    const addedHours = all.reduce(
      (sum, c) => sum + Math.max(0, (c.projectedWeeklyHours ?? 0) - (c.assignedWeeklyHours ?? 0)),
      0,
    )
    const projected =
      base.assignedWeeklyHours != null ? base.assignedWeeklyHours + addedHours : base.projectedWeeklyHours
    const allowed = base.allowedWeeklyHours ?? null

    merged.push({
      ...base,
      fit: all.reduce<VisitPlanCarerFit>((worst, c) => (FIT_RANK[c.fit] > FIT_RANK[worst] ? c.fit : worst), 'good'),
      isPreferred: all.every((c) => c.isPreferred),
      isBlocked: all.some((c) => c.isBlocked),
      hasRotaConflict: all.some((c) => c.hasRotaConflict),
      rotaConflictJobs: unique(all.flatMap((c) => c.rotaConflictJobs ?? [])),
      complianceBlocksAllocation: all.some((c) => c.complianceBlocksAllocation),
      ruleBlocked: all.some((c) => c.ruleBlocked),
      ruleBlockReasons: unique(all.flatMap((c) => c.ruleBlockReasons ?? [])),
      complianceIssues: Math.max(...all.map((c) => c.complianceIssues)),
      availability: {
        ...base.availability,
        availableDays: unique(all.flatMap((c) => c.availability.availableDays)),
        unavailableDays: unique(all.flatMap((c) => c.availability.unavailableDays)),
        timeWindowOk: all.every((c) => c.availability.timeWindowOk),
      },
      skills: {
        matched: base.skills.matched.filter((s) => all.every((c) => c.skills.matched.includes(s))),
        missing: unique(all.flatMap((c) => c.skills.missing)),
      },
      projectedWeeklyHours: projected,
      exceedsContractedHours:
        all.some((c) => c.exceedsContractedHours) || (allowed != null && projected != null && projected > allowed),
      warnings: unique(all.flatMap((c) => c.warnings)),
    })
  }
  return merged
}
