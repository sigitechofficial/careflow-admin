import { describe, expect, it } from 'vitest'
import type { SurveyAnswerInput, SurveyQuestion } from '@/features/surveys/types'
import {
  answerProblems,
  answersToSend,
  commentShown,
  describeQuestionExtras,
  toggleMultiOption,
  visibleQuestions,
} from '@/features/surveys/survey-logic'

const base = (over: Partial<SurveyQuestion>): SurveyQuestion => ({
  id: 'q',
  questionText: 'Q',
  helpText: null,
  questionType: 'YES_NO',
  options: null,
  config: null,
  isRequired: false,
  sortOrder: 0,
  ...over,
})

const visits = base({
  id: 'q1',
  key: 'q-visits',
  questionText: 'Do carers arrive on time?',
  questionType: 'SINGLE_SELECT',
  options: ['Always', 'Rarely', 'Never'],
  isRequired: true,
  commentConfig: { prompt: 'Please tell us why', showWhen: ['Rarely', 'Never'] },
})
const late = base({
  id: 'q2',
  key: 'q-late',
  questionText: 'Did the office tell you?',
  isRequired: true,
  showIf: { questionKey: 'q-visits', answers: ['Rarely', 'Never'] },
})
const help = base({
  id: 'q3',
  key: 'q-help',
  questionText: 'Which help do you get?',
  questionType: 'MULTI_SELECT',
  options: ['Washing', 'Meals', 'None of these'],
  otherOption: { label: 'Other (please tell us)', textPrompt: 'What else?', textRequired: true },
  exclusiveOptions: ['None of these'],
})
const questions = [visits, late, help]

describe('survey answer logic', () => {
  it('asks a question only after the listed answers (multiple choice: any tick)', () => {
    const ids = (answers: Record<string, SurveyAnswerInput>) => visibleQuestions(questions, answers).map(q => q.id)
    expect(ids({})).toEqual(['q1', 'q3'])
    expect(ids({ q1: { questionId: 'q1', selectedOptions: ['Never'] } })).toEqual(['q1', 'q2', 'q3'])
    const meals = base({ id: 'q4', key: 'q-meals', showIf: { questionKey: 'q-help', answers: ['Meals'] } })
    expect(
      visibleQuestions([help, meals], { q3: { questionId: 'q3', selectedOptions: ['Washing', 'Meals'] } }).map(q => q.id),
    ).toEqual(['q3', 'q4'])
  })

  it('answers that clear the others', () => {
    expect(toggleMultiOption(help, ['Washing', 'Meals'], 'None of these')).toEqual(['None of these'])
    expect(toggleMultiOption(help, ['None of these'], 'Meals')).toEqual(['Meals'])
    expect(toggleMultiOption(help, ['Washing'], 'Meals')).toEqual(['Washing', 'Meals'])
    expect(toggleMultiOption(help, ['Washing', 'Meals'], 'Meals')).toEqual(['Washing'])
  })

  it('offers the comment box once answered, after the listed answers only', () => {
    expect(commentShown(visits, undefined)).toBe(false)
    expect(commentShown(visits, { questionId: 'q1', selectedOptions: ['Always'] })).toBe(false)
    expect(commentShown(visits, { questionId: 'q1', selectedOptions: ['Rarely'] })).toBe(true)
    expect(commentShown({ ...visits, commentConfig: { prompt: 'Why?', showWhen: null } }, { questionId: 'q1', selectedOptions: ['Always'] })).toBe(true)
  })

  it('needs the required questions that are asked, and the Other text', () => {
    const answers: Record<string, SurveyAnswerInput> = {
      q1: { questionId: 'q1', selectedOptions: ['Never'] },
      q3: { questionId: 'q3', selectedOptions: ['Other (please tell us)'], otherText: '  ' },
    }
    const problems = answerProblems(questions, answers)
    expect(problems.missingRequired.map(q => q.id)).toEqual(['q2'])
    expect(problems.missingOtherText.map(q => q.id)).toEqual(['q3'])
    expect(answerProblems(questions, { q1: { questionId: 'q1', selectedOptions: ['Always'] } }).missingRequired).toEqual([])
  })

  it('sends only questions that are asked, Other text when chosen and comments when offered', () => {
    const sent = answersToSend(questions, {
      q1: { questionId: 'q1', selectedOptions: ['Always'], comment: 'kept from earlier' },
      q2: { questionId: 'q2', booleanValue: true },
      q3: { questionId: 'q3', selectedOptions: ['Washing'], otherText: 'Shopping' },
    })
    expect(sent).toEqual([
      { questionId: 'q1', selectedOptions: ['Always'] },
      { questionId: 'q3', selectedOptions: ['Washing'] },
    ])
    expect(
      answersToSend(questions, {
        q1: { questionId: 'q1', selectedOptions: ['Never'], comment: '  Late every day  ' },
        q2: { questionId: 'q2', booleanValue: false },
        q3: { questionId: 'q3', selectedOptions: ['Other (please tell us)'], otherText: ' Shopping ' },
      }),
    ).toEqual([
      { questionId: 'q1', selectedOptions: ['Never'], comment: 'Late every day' },
      { questionId: 'q2', booleanValue: false },
      { questionId: 'q3', selectedOptions: ['Other (please tell us)'], otherText: 'Shopping' },
    ])
  })

  it('describes the extras in plain English', () => {
    const textOf = (key: string) => questions.find(q => q.key === key)?.questionText
    expect(describeQuestionExtras(visits, textOf)).toEqual(['Comment box after: Rarely, Never'])
    expect(describeQuestionExtras(late, textOf)).toEqual(['Asked only if “Do carers arrive on time?” is Rarely or Never'])
    expect(describeQuestionExtras(help, textOf)).toEqual([
      'Other (please tell us)',
      'Choosing “None of these” clears other answers',
    ])
  })
})
