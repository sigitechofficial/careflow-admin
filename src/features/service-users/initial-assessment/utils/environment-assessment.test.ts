import { describe, it, expect } from 'vitest'
import {
  ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS,
  ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS,
  isEnvironmentAssessmentComplete,
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
