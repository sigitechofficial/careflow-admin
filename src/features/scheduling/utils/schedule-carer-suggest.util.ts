import type { VisitPlanCarerCandidate, VisitPlanCarerFit } from '@/features/service-users/visit-plan/types'

export function visitPlanCarerFitStyles(fit: VisitPlanCarerFit): string {
  if (fit === 'good') {
    return 'border-emerald-300 bg-emerald-50/60 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
  }
  if (fit === 'partial') {
    return 'border-amber-300 bg-amber-50/60 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
  }
  return 'border-red-300 bg-red-50/60 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100'
}

export function visitPlanCarerFitLabel(fit: VisitPlanCarerFit): string {
  if (fit === 'good') return 'Good match'
  if (fit === 'partial') return 'Partial match'
  return 'Poor match'
}

export function buildRotaBookedEmployeeIds(
  candidates: VisitPlanCarerCandidate[],
): Set<string> {
  return new Set(
    candidates.filter((candidate) => candidate.hasRotaConflict).map((candidate) => candidate.employeeId),
  )
}

export function sortVisitPlanCarerCandidates(
  a: VisitPlanCarerCandidate,
  b: VisitPlanCarerCandidate,
): number {
  if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1
  if (a.isBlocked !== b.isBlocked) return a.isBlocked ? 1 : -1
  return 0
}

export function filterScheduleJobRecommendCarers(
  candidates: VisitPlanCarerCandidate[],
  options: {
    showBlockedCarers: boolean
    allocatedEmployeeIds: ReadonlySet<string>
    replacingEmployeeId?: string | null
    limit?: number
  },
): VisitPlanCarerCandidate[] {
  const limit = options.limit ?? 8
  return candidates
    .filter((candidate) => {
      if (candidate.isBlocked && !options.showBlockedCarers) return false
      if (candidate.hasRotaConflict || candidate.complianceBlocksAllocation) return false
      if (options.replacingEmployeeId) return candidate.employeeId !== options.replacingEmployeeId
      return !options.allocatedEmployeeIds.has(candidate.employeeId)
    })
    .sort(sortVisitPlanCarerCandidates)
    .slice(0, limit)
}

export function filterScheduleRunRecommendCarers(
  candidates: VisitPlanCarerCandidate[],
  showBlockedCarers: boolean,
  limit = 8,
): VisitPlanCarerCandidate[] {
  return candidates
    .filter((candidate) => {
      if (candidate.isBlocked && !showBlockedCarers) return false
      return !candidate.hasRotaConflict && !candidate.complianceBlocksAllocation
    })
    .sort(sortVisitPlanCarerCandidates)
    .slice(0, limit)
}

export const SCHEDULE_CARERS_BOOKED_AT_TIME_MESSAGE =
  'No available carers — others are already booked at this time.'

export function scheduleRecommendCarersEmptyMessage(
  candidates: VisitPlanCarerCandidate[],
  fallbackMessage: string,
): string {
  if (candidates.some((candidate) => candidate.hasRotaConflict)) {
    return SCHEDULE_CARERS_BOOKED_AT_TIME_MESSAGE
  }
  if (candidates.some((candidate) => candidate.complianceBlocksAllocation)) {
    return 'No available carers — others cannot be allocated until mandatory compliance is in order.'
  }
  return fallbackMessage
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Role · job title, omitting duplicates that differ only by case/spacing. */
export function formatVisitPlanCarerRoleLine(
  role: string | null | undefined,
  jobTitle: string | null | undefined,
): string | null {
  const roleLabel = role?.trim() || null
  const titleLabel = jobTitle?.trim() || null
  if (roleLabel && titleLabel && normalizeLabel(roleLabel) !== normalizeLabel(titleLabel)) {
    return `${roleLabel} · ${titleLabel}`
  }
  return roleLabel ?? titleLabel
}

/**
 * Warnings for list display — drops items already shown as badges or in availability.summary
 * (API often re-pushes the summary into warnings).
 */
export function visitPlanCarerListWarnings(
  candidate: Pick<
    VisitPlanCarerCandidate,
    'warnings' | 'availability' | 'isPreferred' | 'isBlocked'
  >,
  limit = 2,
): string[] {
  const summaryNorm = normalizeLabel(candidate.availability.summary ?? '')
  const out: string[] = []
  const seen = new Set<string>()

  for (const warning of candidate.warnings) {
    const trimmed = warning.trim()
    if (!trimmed) continue
    const norm = normalizeLabel(trimmed)
    if (seen.has(norm)) continue
    if (candidate.isPreferred && norm === 'preferred carer') continue
    if (candidate.isBlocked && norm.includes('blocked for this service user')) continue
    if (summaryNorm && (norm === summaryNorm || summaryNorm.includes(norm) || norm.includes(summaryNorm))) {
      continue
    }
    seen.add(norm)
    out.push(trimmed)
    if (out.length >= limit) break
  }
  return out
}
