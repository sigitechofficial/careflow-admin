import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { SurveyDetail, SurveyQuestion, SurveyQuestionSummary } from '@/features/surveys/types'

const { state } = vi.hoisted(() => ({ state: { survey: undefined as unknown } }))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSurvey: () => ({ data: state.survey, isLoading: false }),
}))

import {
  AGREEMENT_SCALE,
  describeLikertScale,
  likertLabels,
  standardScaleOf,
} from '@/features/surveys/survey-likert'
import { describeQuestionType } from '@/features/surveys/api/survey-library.api'
import { SurveySummaryPanel } from '@/features/surveys/components/SurveySummaryPanel'
import { SurveyPreviewDialog } from '@/features/surveys/components/SurveyPreviewDialog'
import { QuestionField } from '@/features/surveys/components/SurveyQuestionField'
import { SURVEY_QUESTION_TYPE_LABELS } from '@/features/surveys/types'

const FREQUENCY = ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never']
const RATING = ['Very good', 'Good', 'Neither good nor poor', 'Poor', 'Very poor']

const scaleQuestion = (id: string, options: string[] | null, sortOrder = 0): SurveyQuestion => ({
  id,
  questionText: `Question ${id}`,
  helpText: null,
  questionType: 'LIKERT',
  options,
  config: null,
  isRequired: false,
  sortOrder,
})

describe('scale (LIKERT) labels', () => {
  it('the built-in agreement scale says "Neither agree nor disagree" in the middle', () => {
    expect(AGREEMENT_SCALE).toEqual(['Strongly agree', 'Agree', 'Neither agree nor disagree', 'Disagree', 'Strongly disagree'])
    expect(likertLabels(null)).toEqual(AGREEMENT_SCALE)
    expect(likertLabels([])).toEqual(AGREEMENT_SCALE)
  })

  it('the type is called a labelled scale, not agree ↔ disagree', () => {
    expect(SURVEY_QUESTION_TYPE_LABELS.LIKERT).toBe('Labelled scale')
  })

  it('recognises the standard scales', () => {
    expect(standardScaleOf(FREQUENCY)).toBe('FREQUENCY')
    expect(standardScaleOf(RATING)).toBe('RATING')
    expect(standardScaleOf(null)).toBe('AGREEMENT')
    expect(standardScaleOf(['Yes', 'Maybe', 'No'])).toBeNull()
  })

  it('describes a scale by its real first and last labels', () => {
    expect(describeLikertScale(FREQUENCY)).toBe('Scale: Always … Never')
    expect(describeLikertScale(RATING)).toBe('Scale: Very good … Very poor')
    expect(describeLikertScale(null)).toBe('Scale: Strongly agree … Strongly disagree')
  })

  it('the ready-made reader lists the real labels (agreement only for the agreement scale)', () => {
    expect(describeQuestionType({ questionType: 'LIKERT', options: FREQUENCY, config: null })).toBe(
      'Scale: Always / Usually / Sometimes / Rarely / Never',
    )
    expect(describeQuestionType({ questionType: 'LIKERT', options: null, config: null })).toBe(
      'Scale: Strongly agree / Agree / Neither agree nor disagree / Disagree / Strongly disagree',
    )
  })

  it('the results summary describes a scale by its labels', () => {
    const summary = (id: string, labels: string[]): SurveyQuestionSummary => ({
      questionId: id,
      questionText: `Question ${id}`,
      questionType: 'LIKERT',
      sortOrder: 0,
      answerCount: 1,
      options: labels.map((label, i) => ({ label, count: i === 0 ? 1 : 0, percent: i === 0 ? 100 : 0 })),
      status: 'current',
    })
    render(<SurveySummaryPanel summaries={[summary('a', FREQUENCY), summary('b', [...AGREEMENT_SCALE])]} />)
    expect(screen.getByText(/Scale: Always … Never · 1 answer/)).toBeInTheDocument()
    expect(screen.getByText(/Scale: Strongly agree … Strongly disagree · 1 answer/)).toBeInTheDocument()
    expect(screen.queryByText(/Agree ↔ Disagree/)).not.toBeInTheDocument()
  })

  it('the preview and the answer form show the built-in scale with the new wording', () => {
    state.survey = {
      id: 's1',
      title: 'Preview',
      description: null,
      isAnonymous: false,
      questions: [scaleQuestion('q1', null), scaleQuestion('q2', FREQUENCY, 1)],
    } as unknown as SurveyDetail
    render(<SurveyPreviewDialog surveyId="s1" open onOpenChange={() => {}} />)
    expect(screen.getByText('Neither agree nor disagree')).toBeInTheDocument()
    expect(screen.getByText('Rarely')).toBeInTheDocument()
    expect(screen.queryByText('Neutral')).not.toBeInTheDocument()
  })

  it('the answer form offers "Neither agree nor disagree" on the built-in scale', () => {
    render(<QuestionField q={scaleQuestion('q1', null)} index={0} value={undefined} disabled={false} onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Neither agree nor disagree' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Neutral' })).not.toBeInTheDocument()
  })
})
