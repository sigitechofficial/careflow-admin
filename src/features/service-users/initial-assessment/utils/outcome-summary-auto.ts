/**
 * Outcome summary (Finalisation tab) — the "initial" column filled from the assessment itself:
 * worksheet scores and baseline vitals. Fill-empty only — anything the assessor typed is kept.
 */
import type {
  ClinicalAssessmentOutcomeSummaryMetadata,
  ClinicalOutcomeRowId,
} from '@/features/service-users/initial-assessment/utils/clinical-assessment-outcome-summary'
import {
  computeWaterlowScore,
  isWaterlowAllSectionsComplete,
  waterlowBand,
  type WaterlowMetadata,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
import {
  computeMustScore,
  isMustScoringComplete,
  mustRiskLabel,
  mustRiskLevel,
  type MustMetadata,
} from '@/features/service-users/initial-assessment/utils/must-scoring'
import {
  abbeySeverityFromTotal,
  computeAbbeyTotal,
  isAbbeyAssessmentComplete,
  isNrsAssessmentComplete,
  NRS_VERBAL_LABELS,
  type PainAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'

export type OutcomeVitals = {
  bpSystolic?: number | null
  bpDiastolic?: number | null
  pulse?: number | null
  pulseRhythm?: string | null
  spo2?: number | null
  respirations?: number | null
  temperature?: number | null
}

export type OutcomeAutoInput = {
  waterlow?: WaterlowMetadata
  must?: MustMetadata
  pain?: PainAssessmentMetadata
  movingHandlingComplete?: boolean
  skinRecorded?: boolean
  vitals?: OutcomeVitals
}

const num = (v: number | null | undefined) => typeof v === 'number' && Number.isFinite(v)

/** Values the assessment already shows, by outcome row (only rows with a value). */
export function autoOutcomeValues(i: OutcomeAutoInput): Partial<Record<ClinicalOutcomeRowId, string>> {
  const out: Partial<Record<ClinicalOutcomeRowId, string>> = {}
  if (i.waterlow && isWaterlowAllSectionsComplete(i.waterlow)) {
    const score = computeWaterlowScore(i.waterlow)
    out.waterlow = `${score} — ${waterlowBand(score).label}`
  }
  if (i.must && isMustScoringComplete(i.must)) {
    const score = computeMustScore(i.must)
    out.must = `${score} — ${mustRiskLabel(mustRiskLevel(score))}`
  }
  if (i.pain && isAbbeyAssessmentComplete(i.pain.abbey)) {
    const total = computeAbbeyTotal(i.pain.abbey)
    out.pain = `Abbey ${total} — ${abbeySeverityFromTotal(total)}`
  } else if (i.pain && isNrsAssessmentComplete(i.pain.nrsScore)) {
    out.pain = `NRS ${i.pain.nrsScore}/10 — ${NRS_VERBAL_LABELS[i.pain.nrsScore as number] ?? ''}`.trim()
  }
  if (i.movingHandlingComplete) out.movingHandling = 'Completed — see Moving and Handling'
  if (i.skinRecorded) out.skinIntegrity = 'Recorded — see skin integrity check'
  const v = i.vitals ?? {}
  if (num(v.bpSystolic) && num(v.bpDiastolic)) out.bloodPressure = `${v.bpSystolic}/${v.bpDiastolic} mmHg`
  if (num(v.pulse)) out.pulseRate = `${v.pulse} bpm`
  if (v.pulseRhythm?.trim()) out.pulseRhythm = v.pulseRhythm.trim()
  if (num(v.spo2)) out.o2Saturations = `${v.spo2}%`
  if (num(v.respirations)) out.respirationRate = `${v.respirations} /min`
  if (num(v.temperature)) out.temperature = `${v.temperature} °C`
  return out
}

/**
 * Fill empty "initial" cells (and the initial date / practitioner) from the assessment. Returns the
 * same object when nothing changes so callers can skip a save.
 */
export function fillOutcomeSummaryFromAssessment(
  meta: ClinicalAssessmentOutcomeSummaryMetadata,
  values: Partial<Record<ClinicalOutcomeRowId, string>>,
  column: { assessmentDate?: string; practitioner?: string },
): ClinicalAssessmentOutcomeSummaryMetadata {
  let changed = false
  const rows = { ...(meta.rows ?? {}) }
  for (const [id, value] of Object.entries(values) as Array<[ClinicalOutcomeRowId, string]>) {
    if (!value || rows[id]?.initial?.trim()) continue
    rows[id] = { ...(rows[id] ?? {}), initial: value }
    changed = true
  }
  const initial = { ...(meta.initial ?? {}) }
  if (!initial.assessmentDate?.trim() && column.assessmentDate) {
    initial.assessmentDate = column.assessmentDate
    changed = true
  }
  if (!initial.practitioner?.trim() && column.practitioner) {
    initial.practitioner = column.practitioner
    changed = true
  }
  return changed ? { ...meta, initial, rows } : meta
}
