import { describe, expect, it } from 'vitest'
import {
  clinicalMeasurementUnit,
  isClinicalMeasurementField,
  isVitalsContextQuestion,
  partitionVitalsSignsQuestions,
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
