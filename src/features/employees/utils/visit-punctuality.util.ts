/**
 * Visit start/end punctuality for CQC evidence and authority exports.
 *
 * Tolerance hierarchy (see careadmin-backend/docs/VISIT_PUNCTUALITY.md):
 * 1. time-critical slot tolerance
 * 2. org domLateVisitAlertMinutes
 * 3. org domGlobalToleranceMinutes
 * 4. industry default 15
 */

export const VISIT_PUNCTUALITY_INDUSTRY_DEFAULT_MINUTES = 15

export type VisitPunctualityKind = 'early' | 'on_time' | 'late' | 'critically_late' | 'unknown'

export type VisitPunctualityOutcome =
  | 'Early'
  | 'On time'
  | 'Late'
  | 'Critically late'
  | 'Not assessed'

export type VisitPunctualityResult = {
  kind: VisitPunctualityKind
  /** actual − planned (minutes); negative = earlier than planned */
  deltaMinutes: number | null
  toleranceMinutes: number
  outcome: VisitPunctualityOutcome
  /** Signed string for exports: "+18", "-5", or "" when not assessed */
  varianceMinutes: string
}

export type VisitPunctualityOrgSettings = {
  domLateVisitAlertMinutes?: number | null
  domGlobalToleranceMinutes?: number | null
}

export type VisitPunctualitySlot = {
  timeCritical?: boolean | null
  timeToleranceMinutes?: number | null
}

export function resolveVisitPunctualityToleranceMinutes(input: {
  org?: VisitPunctualityOrgSettings | null
  slot?: VisitPunctualitySlot | null
}): number {
  const slot = input.slot
  if (slot?.timeCritical) {
    const slotTol = slot.timeToleranceMinutes
    if (typeof slotTol === 'number' && Number.isFinite(slotTol) && slotTol >= 0) {
      return Math.floor(slotTol)
    }
  }

  const lateAlert = input.org?.domLateVisitAlertMinutes
  if (typeof lateAlert === 'number' && Number.isFinite(lateAlert) && lateAlert > 0) {
    return Math.floor(lateAlert)
  }

  const globalTol = input.org?.domGlobalToleranceMinutes
  if (typeof globalTol === 'number' && Number.isFinite(globalTol) && globalTol > 0) {
    return Math.floor(globalTol)
  }

  return VISIT_PUNCTUALITY_INDUSTRY_DEFAULT_MINUTES
}

function minutesDelta(plannedIso: string | null | undefined, actualIso: string | null | undefined): number | null {
  if (!plannedIso || !actualIso) return null
  const planned = new Date(plannedIso).getTime()
  const actual = new Date(actualIso).getTime()
  if (!Number.isFinite(planned) || !Number.isFinite(actual)) return null
  return Math.round((actual - planned) / 60_000)
}

export function classifyVisitPunctuality(
  plannedIso: string | null | undefined,
  actualIso: string | null | undefined,
  toleranceMinutes: number,
): VisitPunctualityResult {
  const tol =
    typeof toleranceMinutes === 'number' && Number.isFinite(toleranceMinutes) && toleranceMinutes >= 0
      ? Math.floor(toleranceMinutes)
      : VISIT_PUNCTUALITY_INDUSTRY_DEFAULT_MINUTES

  const criticallyLateThreshold = Math.max(tol * 2, tol + 15)

  const deltaMinutes = minutesDelta(plannedIso, actualIso)
  if (deltaMinutes == null) {
    return {
      kind: 'unknown',
      deltaMinutes: null,
      toleranceMinutes: tol,
      outcome: 'Not assessed',
      varianceMinutes: '',
    }
  }

  if (deltaMinutes < -tol) {
    return {
      kind: 'early',
      deltaMinutes,
      toleranceMinutes: tol,
      outcome: 'Early',
      varianceMinutes: String(deltaMinutes),
    }
  }
  if (deltaMinutes > criticallyLateThreshold) {
    return {
      kind: 'critically_late',
      deltaMinutes,
      toleranceMinutes: tol,
      outcome: 'Critically late',
      varianceMinutes: `+${deltaMinutes}`,
    }
  }
  if (deltaMinutes > tol) {
    return {
      kind: 'late',
      deltaMinutes,
      toleranceMinutes: tol,
      outcome: 'Late',
      varianceMinutes: `+${deltaMinutes}`,
    }
  }
  return {
    kind: 'on_time',
    deltaMinutes,
    toleranceMinutes: tol,
    outcome: 'On time',
    varianceMinutes: deltaMinutes > 0 ? `+${deltaMinutes}` : String(deltaMinutes),
  }
}

export function visitPunctualityBadgeClass(result: VisitPunctualityResult): string {
  if (result.kind === 'critically_late') {
    return 'bg-destructive/10 text-destructive border-destructive/30'
  }
  if (result.kind === 'late') {
    return 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200'
  }
  if (result.kind === 'early') {
    return 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200'
  }
  if (result.kind === 'on_time') {
    return 'bg-success/10 text-success border-success/20'
  }
  return 'bg-muted text-muted-foreground border-border'
}

export type VisitPunctualityExportFields = {
  startOutcome: VisitPunctualityOutcome
  startVarianceMinutes: string
  endOutcome: VisitPunctualityOutcome
  endVarianceMinutes: string
  toleranceMinutes: number
}

export function visitPunctualityExportFields(input: {
  start: VisitPunctualityResult
  end: VisitPunctualityResult
}): VisitPunctualityExportFields {
  return {
    startOutcome: input.start.outcome,
    startVarianceMinutes: input.start.varianceMinutes,
    endOutcome: input.end.outcome,
    endVarianceMinutes: input.end.varianceMinutes,
    toleranceMinutes: input.start.toleranceMinutes,
  }
}
