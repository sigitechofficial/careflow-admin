import { describe, it, expect } from 'vitest'
import {
  computeLoneWorkerAxes,
  computeLoneWorkerRiskLevel,
  suggestLoneWorkerControlMeasures,
  ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS,
  ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS,
  isEnvironmentAssessmentComplete,
  loneWorkerFactorDetailsMissing,
  normalizeEnvironmentAssessmentMetadata,
  type EnvironmentAssessmentMetadata,
} from './environment-assessment'

/** A metadata object that answers only the original completeness questions. */
function answerAllTableQuestions(): EnvironmentAssessmentMetadata {
  const meta: Record<string, boolean> = {}
  for (const q of ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS) meta[q.id] = false
  return meta as EnvironmentAssessmentMetadata
}

describe('environment assessment completeness (regression safety)', () => {
  it('is complete when only the original table questions are answered', () => {
    expect(isEnvironmentAssessmentComplete(answerAllTableQuestions())).toBe(true)
  })

  it('does NOT require lone-worker factors for completeness', () => {
    const meta = answerAllTableQuestions()
    // No lone-worker factor answered — must still be complete.
    expect(isEnvironmentAssessmentComplete(meta)).toBe(true)
  })

  it('does NOT require the staff-only control fields for completeness', () => {
    const meta = answerAllTableQuestions()
    expect(meta.loneWorkerRiskIdentified).toBeUndefined()
    expect(isEnvironmentAssessmentComplete(meta)).toBe(true)
  })

  it('lone-worker factors are not part of the completeness question set', () => {
    const tableIds = new Set(ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS.map((q) => q.id))
    for (const f of ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS) {
      expect(tableIds.has(f.id as never)).toBe(false)
    }
  })
})

describe('lone-worker per-factor mandatory Risk Details', () => {
  it('a factor answered Yes with no details makes the section incomplete', () => {
    const meta = answerAllTableQuestions()
    meta.unsafeArea = true // no unsafeAreaDetails
    expect(loneWorkerFactorDetailsMissing(meta)).toBe(true)
    expect(isEnvironmentAssessmentComplete(meta)).toBe(false)
  })

  it('a factor answered Yes with details filled is complete', () => {
    const meta = answerAllTableQuestions()
    meta.unsafeArea = true
    meta.unsafeAreaDetails = 'Anti-social behaviour reported nearby.'
    expect(loneWorkerFactorDetailsMissing(meta)).toBe(false)
    expect(isEnvironmentAssessmentComplete(meta)).toBe(true)
  })

  it('whitespace-only details do not satisfy the requirement', () => {
    const meta = answerAllTableQuestions()
    meta.carerWorksAlone = true
    meta.carerWorksAloneDetails = '   '
    expect(isEnvironmentAssessmentComplete(meta)).toBe(false)
  })

  it('a factor answered No imposes no details requirement', () => {
    const meta = answerAllTableQuestions()
    meta.unsafeArea = false
    expect(loneWorkerFactorDetailsMissing(meta)).toBe(false)
    expect(isEnvironmentAssessmentComplete(meta)).toBe(true)
  })

  it('every factor declares a details key that exists on the metadata', () => {
    const normalized = normalizeEnvironmentAssessmentMetadata({
      unsafeArea: true,
      unsafeAreaDetails: 'details here',
    })
    expect(normalized.unsafeAreaDetails).toBe('details here')
    for (const f of ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS) {
      expect(typeof f.detailsKey).toBe('string')
    }
  })
})

describe('computeLoneWorkerRiskLevel (Likelihood × Severity matrix)', () => {
  it('returns null when no factor is answered Yes', () => {
    expect(computeLoneWorkerRiskLevel({})).toBeNull()
    expect(computeLoneWorkerRiskLevel({ unsafeArea: false })).toBeNull()
  })

  it('a single minor-severity factor is Low (Low × Medium = 2)', () => {
    expect(computeLoneWorkerRiskLevel({ isolatedProperty: true })).toBe('Low')
  })

  it('unsafe area is Medium (Medium × Medium = 4)', () => {
    expect(computeLoneWorkerRiskLevel({ unsafeArea: true })).toBe('Med')
  })

  it('unsafe area + no mobile signal is High (Medium × High = 6)', () => {
    expect(computeLoneWorkerRiskLevel({ unsafeArea: true, noMobileSignal: true })).toBe('High')
  })

  it('any High × High factor is High', () => {
    expect(computeLoneWorkerRiskLevel({ physicalViolence: true })).toBe('High')
    expect(computeLoneWorkerRiskLevel({ previousSosEvent: true })).toBe('High')
  })

  it('aggression (High likelihood × Medium severity) is High', () => {
    expect(computeLoneWorkerRiskLevel({ aggression: true })).toBe('High')
  })

  it('works-alone + night visits pushes severity to High → Medium overall (Low × High = 3)', () => {
    const axes = computeLoneWorkerAxes({ carerWorksAlone: true, nightVisits: true })
    expect(axes?.severity).toBe('High')
    expect(axes?.level).toBe('Med')
  })
})

describe('suggestLoneWorkerControlMeasures', () => {
  it('returns no suggestions when no factor is Yes', () => {
    expect(suggestLoneWorkerControlMeasures({})).toEqual([])
    expect(suggestLoneWorkerControlMeasures({ unsafeArea: false })).toEqual([])
  })

  it('suggests a measure for each Yes factor, in display order, deduped', () => {
    const s = suggestLoneWorkerControlMeasures({ physicalViolence: true, nightVisits: true })
    expect(s.length).toBe(2)
    expect(s.some((m) => /two-carer/i.test(m))).toBe(true)
    expect(s.some((m) => /night visits/i.test(m))).toBe(true)
    // no duplicate strings
    expect(new Set(s).size).toBe(s.length)
  })
})

describe('environment assessment normalizer (new fields)', () => {
  it('round-trips lone-worker factor booleans and control fields', () => {
    const normalized = normalizeEnvironmentAssessmentMetadata({
      unsafeArea: true,
      carerWorksAlone: true,
      loneWorkerRiskIdentified: true,
      loneWorkerRiskLevel: 'High',
      staffSafetyInstructions: 'Ring office on arrival.',
    })
    expect(normalized.unsafeArea).toBe(true)
    expect(normalized.carerWorksAlone).toBe(true)
    expect(normalized.loneWorkerRiskIdentified).toBe(true)
    expect(normalized.loneWorkerRiskLevel).toBe('High')
    expect(normalized.staffSafetyInstructions).toBe('Ring office on arrival.')
  })

  it('drops an invalid risk level and defaults missing fields to undefined', () => {
    const normalized = normalizeEnvironmentAssessmentMetadata({
      loneWorkerRiskLevel: 'Critical', // not a valid level
    })
    expect(normalized.loneWorkerRiskLevel).toBeUndefined()
    expect(normalized.unsafeArea).toBeUndefined()
    expect(normalized.loneWorkerRiskIdentified).toBeUndefined()
  })

  it('normalizes a legacy snapshot (no lone-worker data) cleanly', () => {
    const normalized = normalizeEnvironmentAssessmentMetadata({ pets: true, staffNotes: 'ok' })
    expect(normalized.pets).toBe(true)
    expect(normalized.staffNotes).toBe('ok')
    expect(normalized.pastSafeguardingIncident).toBeUndefined()
  })
})
