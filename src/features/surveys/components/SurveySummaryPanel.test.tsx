import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SurveySummaryPanel } from '@/features/surveys/components/SurveySummaryPanel'
import type { SurveyQuestionSummary } from '@/features/surveys/types'

const yesNo = (overrides: Partial<SurveyQuestionSummary>): SurveyQuestionSummary => ({
  questionId: 'q',
  questionText: 'Question',
  questionType: 'YES_NO',
  sortOrder: 0,
  answerCount: 2,
  options: [
    { label: 'Yes', count: 1, percent: 50 },
    { label: 'No', count: 1, percent: 50 },
  ],
  status: 'current',
  ...overrides,
})

describe('SurveySummaryPanel — repeating survey history', () => {
  const summaries: SurveyQuestionSummary[] = [
    yesNo({ questionId: 'src-q1', questionText: 'Do you feel supported by your manager?', answerCount: 1 }),
    yesNo({
      questionId: 'p1-q1',
      questionText: 'How supported do you feel?',
      status: 'reworded',
      currentQuestionText: 'Do you feel supported by your manager?',
      askedIn: [
        { id: 'p1', title: 'Staff survey — Sep 2026', periodKey: '2026-09' },
        { id: 'p2', title: 'Staff survey — Oct 2026', periodKey: '2026-10' },
      ],
    }),
    yesNo({ questionId: 'src-q2', questionText: 'Would you recommend us?', sortOrder: 1 }),
    yesNo({
      questionId: 'p1-q3',
      questionText: 'Did you get your rota on time?',
      status: 'removed',
      askedIn: [{ id: 'p1', title: 'Staff survey — Sep 2026', periodKey: '2026-09' }],
    }),
  ]

  it('labels retired questions and shows the periods they were asked in', () => {
    render(<SurveySummaryPanel summaries={summaries} />)
    const reworded = screen.getByTestId('retired-question-reworded')
    expect(within(reworded).getByText('Reworded')).toBeInTheDocument()
    expect(reworded).toHaveTextContent('Earlier wording — now “Do you feel supported by your manager?”')
    expect(reworded).toHaveTextContent('Asked in Sep 2026, Oct 2026.')
    expect(within(reworded).getByText('Yes')).toBeInTheDocument()

    const removed = screen.getByTestId('retired-question-removed')
    expect(within(removed).getByText('Removed')).toBeInTheDocument()
    expect(removed).toHaveTextContent('No longer asked. Asked in Sep 2026.')
  })

  it('numbers only the current questions', () => {
    render(<SurveySummaryPanel summaries={summaries} />)
    expect(screen.getByText(/^1\. Do you feel supported by your manager\?/)).toBeInTheDocument()
    expect(screen.getByText(/^2\. Would you recommend us\?/)).toBeInTheDocument()
    expect(screen.queryByText(/^\d+\. How supported do you feel\?/)).not.toBeInTheDocument()
  })

  it('summaries without a status (single surveys) render as before', () => {
    render(<SurveySummaryPanel summaries={[{ ...yesNo({}), status: undefined }]} />)
    expect(screen.getByText(/^1\. Question/)).toBeInTheDocument()
    expect(screen.queryByTestId(/retired-question/)).not.toBeInTheDocument()
  })
})

describe('SurveySummaryPanel — written answers', () => {
  const choice = (overrides: Partial<SurveyQuestionSummary>): SurveyQuestionSummary =>
    yesNo({
      questionId: 'help',
      questionText: 'Which help do you get?',
      questionType: 'MULTI_SELECT',
      answerCount: 3,
      options: [
        { label: 'Washing', count: 2, percent: 67 },
        { label: 'Other (please tell us)', count: 1, percent: 33 },
      ],
      ...overrides,
    })

  it('lists Other text and comments under the question, with who wrote them on named surveys', () => {
    render(
      <SurveySummaryPanel
        summaries={[
          choice({
            writtenAnswerCount: 2,
            writtenAnswers: [
              { answer: 'Other (please tell us)', otherText: 'Shopping', comment: null, respondentName: 'Ada Lovelace' },
              { answer: 'Washing', otherText: null, comment: 'Always rushed', respondentName: null },
            ],
          }),
        ]}
      />,
    )
    const written = screen.getByTestId('written-answers')
    expect(written).toHaveTextContent('Written answers (2)')
    expect(written).toHaveTextContent('Other: “Shopping”')
    expect(written).toHaveTextContent('— Ada Lovelace')
    expect(written).toHaveTextContent('Answered: Washing')
    expect(written).toHaveTextContent('Comment: “Always rushed”')
    // "Other" is counted as a choice like the rest.
    expect(screen.getByText('Other (please tell us)')).toBeInTheDocument()
  })

  it('says when only the latest are shown', () => {
    render(
      <SurveySummaryPanel
        summaries={[
          choice({
            writtenAnswerCount: 60,
            writtenAnswers: [{ answer: null, otherText: null, comment: 'Fine', respondentName: null }],
          }),
        ]}
      />,
    )
    expect(screen.getByText(/Showing the latest 1 of 60/)).toBeInTheDocument()
  })

  it('anonymous surveys: none until closed with 5 or more responses (the rule is spelled out)', () => {
    render(<SurveySummaryPanel summaries={[choice({ writtenAnswers: [], writtenAnswerCount: 0, writtenAnswersWithheld: true })]} />)
    expect(screen.queryByTestId('written-answers')).not.toBeInTheDocument()
    expect(screen.getByTestId('written-answers-withheld')).toHaveTextContent(
      'Written answers on an anonymous survey are shown once the survey has closed and at least 5 people have answered',
    )
  })

  it('uses the note from the results, and shows closed periods’ answers with it', () => {
    render(
      <SurveySummaryPanel
        writtenAnswersNote="Closed periods only. Written answers on an anonymous survey are shown once the period has closed…"
        summaries={[
          choice({
            writtenAnswerCount: 1,
            writtenAnswersWithheld: true,
            writtenAnswers: [{ answer: null, otherText: null, comment: 'From October', respondentName: null }],
          }),
        ]}
      />,
    )
    expect(screen.getByTestId('written-answers')).toHaveTextContent('From October')
    expect(screen.getByTestId('written-answers-withheld')).toHaveTextContent(/^Closed periods only/)
  })

  it('a held-back text question does not say "No displayable answers"', () => {
    render(
      <SurveySummaryPanel
        summaries={[
          yesNo({ questionType: 'TEXTAREA', options: undefined, textSamples: [], writtenAnswersWithheld: true, answerCount: 3 }),
        ]}
      />,
    )
    expect(screen.queryByText('No displayable answers.')).not.toBeInTheDocument()
    expect(screen.getByTestId('written-answers-withheld')).toBeInTheDocument()
  })

  it('shows nothing extra when there are no written answers', () => {
    render(<SurveySummaryPanel summaries={[choice({ writtenAnswers: [], writtenAnswerCount: 0 })]} />)
    expect(screen.queryByTestId('written-answers')).not.toBeInTheDocument()
    expect(screen.queryByTestId('written-answers-withheld')).not.toBeInTheDocument()
  })
})

describe('SurveySummaryPanel — CareFlow-list (equality) questions', () => {
  it('shows groups, the detailed answers allowed and why the rest are grouped', () => {
    render(
      <SurveySummaryPanel
        summaries={[
          yesNo({
            questionId: 'q-eth',
            questionText: 'What is your ethnic group?',
            questionType: 'SINGLE_SELECT',
            answerCount: 12,
            optionsFrom: 'ETHNICITY',
            options: [
              { label: 'Asian', count: 11, percent: 92 },
              { label: 'Arab', count: 1, percent: 8 },
            ],
            lookupDetails: [{ group: 'Asian', label: 'Asian - Gujarati', count: 10 }],
            lookupDetailsNote: 'Answers are shown by group. A detailed answer is shown only when at least 10 people chose it.',
          }),
        ]}
      />,
    )
    const details = screen.getByTestId('lookup-details')
    expect(details).toHaveTextContent('Asian - Gujarati: 10')
    expect(details).toHaveTextContent('at least 10 people')
    expect(screen.queryByText('Asian - Punjabi')).not.toBeInTheDocument()
  })
})
