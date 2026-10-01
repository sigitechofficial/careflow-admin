import { describe, it, expect } from 'vitest'
import { autoOutcomeValues, fillOutcomeSummaryFromAssessment } from './outcome-summary-auto'
import { defaultClinicalAssessmentOutcomeSummaryMetadata } from './clinical-assessment-outcome-summary'

describe('autoOutcomeValues', () => {
  it('reads pain and baseline vitals from the assessment', () => {
    const v = autoOutcomeValues({
      pain: { nrsScore: 4 },
      vitals: { bpSystolic: 128, bpDiastolic: 82, pulse: 72, pulseRhythm: 'Regular', spo2: 97, temperature: 36.8 },
      movingHandlingComplete: true,
    })
    expect(v).toMatchObject({
      pain: 'NRS 4/10 — Moderate Pain',
      bloodPressure: '128/82 mmHg',
      pulseRate: '72 bpm',
      pulseRhythm: 'Regular',
      o2Saturations: '97%',
      temperature: '36.8 °C',
      movingHandling: 'Completed — see Moving and Handling',
    })
    expect(v.waterlow).toBeUndefined()
    expect(v.respirationRate).toBeUndefined()
  })

  it('needs both blood pressure readings', () => {
    expect(autoOutcomeValues({ vitals: { bpSystolic: 120 } }).bloodPressure).toBeUndefined()
  })
})

describe('fillOutcomeSummaryFromAssessment', () => {
  it('fills only empty cells and keeps what the assessor typed', () => {
    const meta = defaultClinicalAssessmentOutcomeSummaryMetadata()
    meta.rows = { pulseRate: { initial: '80 (typed)', reviews: [] } }
    const next = fillOutcomeSummaryFromAssessment(
      meta,
      { pulseRate: '72 bpm', temperature: '36.8 °C' },
      { assessmentDate: '2026-09-29', practitioner: 'A. Assessor' },
    )
    expect(next.rows?.pulseRate?.initial).toBe('80 (typed)')
    expect(next.rows?.temperature?.initial).toBe('36.8 °C')
    expect(next.initial).toMatchObject({ assessmentDate: '2026-09-29', practitioner: 'A. Assessor' })
  })

  it('returns the same object when there is nothing to fill', () => {
    const meta = defaultClinicalAssessmentOutcomeSummaryMetadata()
    meta.initial = { assessmentDate: '2026-09-01', practitioner: 'B' }
    expect(fillOutcomeSummaryFromAssessment(meta, {}, { assessmentDate: '2026-09-29' })).toBe(meta)
  })
})
