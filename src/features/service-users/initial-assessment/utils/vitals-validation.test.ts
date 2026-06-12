import { describe, expect, it } from 'vitest'
import {
  clinicalMeasurementUnit,
  defaultVitalAcceptedRanges,
  isClinicalMeasurementField,
  isVitalsContextQuestion,
  normalizeVitalAcceptedRanges,
  partitionVitalsSignsQuestions,
  resolveVitalFieldRules,
  validateVitalValue,
  vitalAcceptedRangeWarning,
} from './vitals-validation'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

function q(partial: Partial<InitialAssessmentQuestion> & Pick<InitialAssessmentQuestion, 'questionType'>): InitialAssessmentQuestion {
  return {
    id: '1',
    questionText: partial.questionText ?? 'Test',
    isRequired: false,
    riskFlag: false,
    carePlanTrigger: false,
    sortOrder: 1,
    ...partial,
  }
}

describe('clinical measurement fields', () => {
  it('detects vitals and BP variants', () => {
    expect(
      isClinicalMeasurementField(
        q({ questionType: 'NUMBER', metadata: { fieldKey: 'temperature' } }),
      ),
    ).toBe(true)
    expect(
      isClinicalMeasurementField(
        q({ questionType: 'NUMBER', metadata: { fieldKey: 'bpLyingSystolic' } }),
      ),
    ).toBe(true)
    expect(isClinicalMeasurementField(q({ questionType: 'YES_NO', metadata: { fieldKey: 'temperature' } }))).toBe(
      false,
    )
  })

  it('partitions vitals context to the panel footer', () => {
    const measurement = q({ questionType: 'NUMBER', metadata: { fieldKey: 'temperature' } })
    const context = q({
      questionType: 'TEXTAREA',
      metadata: { fieldKey: 'vitalsContext' },
    })
    expect(isVitalsContextQuestion(context)).toBe(true)
    const { measurementQuestions, contextQuestion } = partitionVitalsSignsQuestions([
      context,
      measurement,
    ])
    expect(measurementQuestions).toEqual([measurement])
    expect(contextQuestion).toEqual(context)
  })

  it('normalizes persisted accepted ranges', () => {
    const defaults = defaultVitalAcceptedRanges()
    expect(normalizeVitalAcceptedRanges(undefined)).toEqual(defaults)
    expect(defaults.temperature).toEqual({ min: 36.1, max: 38.0 })
    expect(defaults.pulse).toEqual({ min: 51, max: 90 })
    expect(
      resolveVitalFieldRules({
        ...defaults,
        temperature: { min: 35, max: 42 },
      }).find((r) => r.fieldKey === 'temperature'),
    ).toMatchObject({ min: 35, max: 42 })
  })

  it('migrates legacy wide default ranges to UK reference defaults', () => {
    const migrated = normalizeVitalAcceptedRanges({
      temperature: { min: 30, max: 45 },
      pulse: { min: 30, max: 250 },
    })
    expect(migrated.temperature).toEqual({ min: 36.1, max: 38.0 })
    expect(migrated.pulse).toEqual({ min: 51, max: 90 })
  })

  it('allows plausible abnormal values but warns outside accepted range', () => {
    const ranges = defaultVitalAcceptedRanges()
    expect(validateVitalValue('temperature', 39.5, ranges)).toBeNull()
    expect(vitalAcceptedRangeWarning('temperature', 40, ranges)).toContain('outside the accepted range')
    expect(validateVitalValue('temperature', 50, ranges)).toContain('must be between')
  })

  it('resolves display units', () => {
    expect(
      clinicalMeasurementUnit(
        q({
          questionType: 'NUMBER',
          questionText: 'Temperature (°C)',
          metadata: { fieldKey: 'temperature' },
        }),
      ),
    ).toBe('°C')
    expect(
      clinicalMeasurementUnit(
        q({
          questionType: 'NUMBER',
          questionText: 'Blood pressure — lying systolic (mmHg)',
          metadata: { fieldKey: 'bpLyingSystolic' },
        }),
      ),
    ).toBe('mmHg')
  })
})
