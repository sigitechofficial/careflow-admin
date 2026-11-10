import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SurveyDetail, SurveyQuestion, SurveyResponseItem } from '@/features/surveys/types'

const { state, updateAsync } = vi.hoisted(() => ({
  state: { survey: undefined as unknown },
  updateAsync: vi.fn(),
}))
vi.mock('@/features/surveys/hooks/useSurveys', () => ({
  useSurvey: () => ({ data: state.survey, isLoading: false }),
  useRecordSurveyResponse: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRecordedSurveyResponse: () => ({ mutateAsync: updateAsync, isPending: false }),
  useSurveyRecordCandidates: () => ({ data: [], isFetching: false }),
}))
vi.mock('@/shared/lib/toast', () => ({ toastSuccess: vi.fn(), toastApiError: vi.fn() }))

import { SurveyPreviewDialog } from '@/features/surveys/components/SurveyPreviewDialog'
import { RecordSurveyResponseDialog } from '@/features/surveys/components/RecordSurveyResponseDialog'

const q = (over: Partial<SurveyQuestion>): SurveyQuestion => ({
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

const questions: SurveyQuestion[] = [
  q({
    id: 'q1',
    key: 'q-visits',
    questionText: 'Do carers arrive on time?',
    questionType: 'SINGLE_SELECT',
    options: ['Always', 'Rarely', 'Never'],
    isRequired: true,
    commentConfig: { prompt: 'Please tell us why', showWhen: ['Rarely', 'Never'] },
  }),
  q({
    id: 'q2',
    key: 'q-late',
    questionText: 'Did the office tell you they would be late?',
    isRequired: true,
    sortOrder: 1,
    showIf: { questionKey: 'q-visits', answers: ['Rarely', 'Never'] },
  }),
  q({
    id: 'q3',
    key: 'q-help',
    questionText: 'Which help do you get?',
    questionType: 'MULTI_SELECT',
    options: ['Washing', 'Meals', 'None of these'],
    sortOrder: 2,
    otherOption: { label: 'Other (please tell us)', textPrompt: 'What else do we help with?', textRequired: true },
    exclusiveOptions: ['None of these'],
  }),
]

const pressed = (name: string) => (screen.getByRole('checkbox', { name }) as HTMLInputElement).checked

describe('answer form: live behaviour (preview)', () => {
  beforeEach(() => {
    state.survey = { id: 's1', title: 'Feedback', description: null, isAnonymous: true, questions } as unknown as SurveyDetail
  })

  it('asks a question only after the listed answers, and offers the comment box after them', async () => {
    render(<SurveyPreviewDialog surveyId="s1" open onOpenChange={() => {}} />)
    expect(screen.queryByText('Did the office tell you they would be late?')).not.toBeInTheDocument()
    expect(screen.getByText(/1 question is asked only after certain answers/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Always' }))
    expect(screen.queryByTestId('comment-q1')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Never' }))
    expect(screen.getByText('Did the office tell you they would be late?')).toBeInTheDocument()
    expect(screen.getByTestId('comment-q1')).toBeInTheDocument()
    expect(screen.getByText('Please tell us why (optional)')).toBeInTheDocument()
    // Anonymous survey: a reminder under each text box.
    expect(screen.getByText('Please do not include names.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Always' }))
    expect(screen.queryByText('Did the office tell you they would be late?')).not.toBeInTheDocument()
  })

  it('shows the Other text box when Other is chosen, and clears ticks with "None of these"', async () => {
    render(<SurveyPreviewDialog surveyId="s1" open onOpenChange={() => {}} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Washing' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other (please tell us)' }))
    expect(screen.getByTestId('other-text-q3')).toBeInTheDocument()
    expect(screen.getByText('What else do we help with?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'None of these' }))
    expect(pressed('None of these')).toBe(true)
    expect(pressed('Washing')).toBe(false)
    expect(screen.queryByTestId('other-text-q3')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Meals' }))
    expect(pressed('None of these')).toBe(false)
    expect(pressed('Meals')).toBe(true)
  })

  it('uses native radio buttons and check boxes, so screen readers hear which answers are chosen', async () => {
    render(<SurveyPreviewDialog surveyId="s1" open onOpenChange={() => {}} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Never' }))
    expect(screen.getByRole('radio', { name: 'Never' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Always' })).not.toBeChecked()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Meals' }))
    expect(screen.getByRole('checkbox', { name: 'Meals' })).toBeChecked()
    // Each question is a group named by the question, so the answers are heard in context.
    expect(screen.getByRole('group', { name: 'Do carers arrive on time? (required)' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Which help do you get?' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Never' })).not.toBeInTheDocument()
  })
})

describe('record response dialog: staff type the person’s words', () => {
  beforeEach(() => {
    updateAsync.mockReset().mockResolvedValue({})
  })

  const recorded: SurveyResponseItem = {
    id: 'r1',
    submittedAt: '2026-11-04T10:30:00.000Z',
    respondentLabel: 'Pat Jones',
    employeeId: null,
    serviceUserId: 'su1',
    respondentRelation: 'SELF',
    channel: 'PAPER',
    canEdit: true,
    answerCount: 1,
    answers: [
      {
        questionId: 'q1',
        questionText: 'Do carers arrive on time?',
        questionType: 'SINGLE_SELECT',
        booleanValue: null,
        textValue: null,
        numberValue: null,
        selectedOptions: ['Always'],
        displayValue: 'Always',
      },
    ],
  }

  it('follows the rules live and sends the Other text and comment', async () => {
    render(
      <RecordSurveyResponseDialog
        surveyId="s1"
        targetKind="SERVICE_USER"
        questions={questions}
        open
        editing={recorded}
        onClose={() => {}}
      />,
    )
    expect(screen.queryByText('Did the office tell you they would be late?')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Rarely' }))
    await userEvent.type(screen.getByTestId('comment-q1'), 'Weekends are worst')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Other (please tell us)' }))
    await userEvent.type(screen.getByTestId('record-edit-reason'), 'Typed from paper')
    expect(screen.getByText(/Answer the required question: Did the office tell you/)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('radio', { name: 'No' })[0]!)
    expect(screen.getByText(/Type their “Other” answer for: Which help do you get\?/)).toBeInTheDocument()
    await userEvent.type(screen.getByTestId('other-text-q3'), 'Gardening')
    await userEvent.click(screen.getByTestId('record-submit'))
    await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1))
    expect(updateAsync.mock.calls[0][0].input.answers).toEqual([
      { questionId: 'q1', selectedOptions: ['Rarely'], comment: 'Weekends are worst' },
      { questionId: 'q2', booleanValue: false },
      { questionId: 'q3', selectedOptions: ['Other (please tell us)'], otherText: 'Gardening' },
    ])
  })

  it('drops answers to a question that is no longer asked', async () => {
    render(
      <RecordSurveyResponseDialog
        surveyId="s1"
        targetKind="SERVICE_USER"
        questions={questions}
        open
        editing={{
          ...recorded,
          answers: [
            { ...recorded.answers[0]!, selectedOptions: ['Never'], comment: 'Late' },
            { ...recorded.answers[0]!, questionId: 'q2', questionType: 'YES_NO', selectedOptions: null, booleanValue: true },
          ],
        }}
        onClose={() => {}}
      />,
    )
    expect(screen.getByTestId('comment-q1')).toHaveValue('Late')
    await userEvent.click(screen.getByRole('radio', { name: 'Always' }))
    await userEvent.type(screen.getByTestId('record-edit-reason'), 'Wrong answer')
    await userEvent.click(screen.getByTestId('record-submit'))
    await waitFor(() => expect(updateAsync).toHaveBeenCalledTimes(1))
    expect(updateAsync.mock.calls[0][0].input.answers).toEqual([{ questionId: 'q1', selectedOptions: ['Always'] }])
  })
})
